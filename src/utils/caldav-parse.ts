import ICAL from 'ical.js';
import type { CalendarEvent, Attendee } from '@/types';
import { dedupeAttendees } from '@/utils/attendees';
import { yieldToUI } from '@/utils/scheduling';
import { isValidTimeZone, zonedWallTimeToUtc } from '@/utils/timezone';
import { triggerToMinutes } from '@/features/notifications/alerts';

interface ParseCalMeta {
  calendarId: string;
  accountId: string;
  color: string;
}

const TALK_URL_PATTERN = /\/call\//;

const MAX_OCCURRENCES = 1000;


function firstAlarmMinutes(vevent: ICAL.Component): number | undefined {
  const alarm = vevent.getFirstSubcomponent('valarm');
  const trigger = alarm?.getFirstProperty('trigger');
  if (!trigger) return undefined;
  const minutes = triggerToMinutes(trigger.toICALString().replace(/^TRIGGER[^:]*:/i, ''));
  return minutes ?? undefined;
}

function eventTzid(vevent: ICAL.Component): string | undefined {
  const raw = vevent.getFirstProperty('dtstart')?.getParameter('tzid');
  if (typeof raw !== 'string' || !raw) return undefined;
  if (isValidTimeZone(raw)) return raw;
  console.warn(`[caldav-parse] unresolvable TZID "${raw}", falling back to ical.js`);
  return undefined;
}

function resolveInstant(t: ICAL.Time, tzid: string | undefined, isEnd = false): Date {
  if (t.isDate) {
    return isEnd
      ? new Date(t.year, t.month - 1, t.day - 1)
      : new Date(t.year, t.month - 1, t.day);
  }
  if (tzid) {
    return zonedWallTimeToUtc(t.year, t.month, t.day, t.hour, t.minute, t.second, tzid);
  }
  return t.toJSDate();
}

function repairIcsFolding(ics: string): string {
  const isPropertyStart = (line: string) =>
    /^(BEGIN|END):/i.test(line) || /^[A-Za-z][A-Za-z0-9-]*[;:]/.test(line);

  const out: string[] = [];
  for (const line of ics.split(/\r\n|\r|\n/)) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else if (out.length && !isPropertyStart(line)) {
      out[out.length - 1] += line;
    } else {
      out.push(line);
    }
  }
  return out.join('\r\n');
}

function parseIcsToJcal(ics: string): ReturnType<typeof ICAL.parse> {
  try {
    return ICAL.parse(ics);
  } catch {
    return ICAL.parse(repairIcsFolding(ics));
  }
}

export function parseIcsItem(
  item: { ics: string; href: string },
  meta: ParseCalMeta,
  rangeStart?: Date,
  rangeEnd?: Date,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const { ics, href } = item;

  try {
    const jcal = parseIcsToJcal(ics);
    const comp = new ICAL.Component(jcal);
    const vevents = comp.getAllSubcomponents('vevent');

    for (const vevent of vevents) {
      if (vevent.getFirstPropertyValue('recurrence-id')) continue;

      const icalEvent = new ICAL.Event(vevent, { strictExceptions: false });
      const tzid = eventTzid(vevent);

      const attendees: Attendee[] = dedupeAttendees(
        vevent.getAllProperties('attendee').map((prop: ICAL.Property) => {
          const value = (prop.getFirstValue() as string) ?? '';
          const email = value.replace(/^mailto:/i, '');
          const displayName = (prop.getParameter('cn') as string) ?? undefined;
          return { email, displayName };
        })
      );

      const location = icalEvent.location ?? undefined;
      const talkUrl = location && TALK_URL_PATTERN.test(location) ? location : undefined;

      const organizerProp = vevent.getFirstProperty('organizer');
      const organizerEmail = organizerProp
        ? (organizerProp.getFirstValue() as string).replace(/^mailto:/i, '')
        : undefined;

      const alarmMinutes = firstAlarmMinutes(vevent);

      const rruleProp = vevent.getFirstProperty('rrule');
      const isRecurring = !!rruleProp;
      const rruleStr: string | undefined = rruleProp
        ? rruleProp.toICALString()
        : undefined;

      const base = {
        uid: icalEvent.uid,
        href,
        calendarId: meta.calendarId,
        accountId: meta.accountId,
        summary: icalEvent.summary,
        description: icalEvent.description ?? undefined,
        location,
        allDay: icalEvent.startDate.isDate,
        color: meta.color,
        attendees,
        organizerEmail,
        talkUrl,
        isRecurring,
        rrule: rruleStr,
        alarmMinutes,
      };

      if (isRecurring && (rangeStart || rangeEnd)) {
        const durationMs =
          icalEvent.endDate.toJSDate().getTime() - icalEvent.startDate.toJSDate().getTime();
        const rangeStartMs = rangeStart?.getTime() ?? -Infinity;
        const iter = icalEvent.iterator();
        let emitted = 0;
        let nextTime: ICAL.Time;

        while ((nextTime = iter.next()) && emitted < MAX_OCCURRENCES) {
          const occStart = resolveInstant(nextTime, tzid);

          if (rangeEnd && occStart >= rangeEnd) break;

          if (occStart.getTime() + durationMs <= rangeStartMs) continue;

          const details = icalEvent.getOccurrenceDetails(nextTime);
          const occAllDay = details.startDate.isDate;
          const occEnd = resolveInstant(details.endDate, tzid, true);

          if (rangeStart && occEnd <= rangeStart) continue;

          events.push({
            ...base,
            uid: `${icalEvent.uid}_occ_${nextTime.toUnixTime()}`,
            href,
            dtstart: occStart,
            dtend: occEnd,
            allDay: occAllDay,
          });
          emitted++;
        }
      } else {
        events.push({
          ...base,
          dtstart: resolveInstant(icalEvent.startDate, tzid),
          dtend: resolveInstant(icalEvent.endDate, tzid, true),
        });
      }
    }
  } catch (error) {
    console.warn(`[caldav-parse] failed to parse ICS (${href}):`, error);
  }

  return events;
}

export function extractDtstartTzid(ics: string): string | undefined {
  const m = ics.match(/^DTSTART[^:\r\n]*;TZID=([^:;\r\n]+)/m);
  const tzid = m?.[1];
  return tzid && isValidTimeZone(tzid) ? tzid : undefined;
}

/**
 * The master VEVENT's start and end, as absolute instants.
 *
 * Needed to move a whole series by a delta: the occurrence's own dates say
 * nothing about where the series begins, and writing them onto the master would
 * restart it there and drop every earlier occurrence.
 *
 * Returns undefined when the ICS cannot be read; a caller about to rewrite a
 * master must then abort rather than fall back to the occurrence's dates.
 */
export function extractDtstartDtend(ics: string): { dtstart: Date; dtend: Date } | undefined {
  try {
    const comp = new ICAL.Component(parseIcsToJcal(ics));
    const master = comp
      .getAllSubcomponents('vevent')
      .find((v: ICAL.Component) => !v.getFirstPropertyValue('recurrence-id'));
    if (!master) return undefined;
    const icalEvent = new ICAL.Event(master, { strictExceptions: false });
    const tzid = eventTzid(master);
    return {
      dtstart: resolveInstant(icalEvent.startDate, tzid),
      dtend: resolveInstant(icalEvent.endDate, tzid, true),
    };
  } catch {
    return undefined;
  }
}

export function parseIcsObjects(
  items: { ics: string; href: string }[],
  meta: ParseCalMeta,
  rangeStart?: Date,
  rangeEnd?: Date,
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const item of items) {
    const parsed = parseIcsItem(item, meta, rangeStart, rangeEnd);
    if (parsed.length) events.push(...parsed);
  }
  return events;
}


export async function parseIcsObjectsAsync(
  items: { ics: string; href: string }[],
  meta: ParseCalMeta,
  rangeStart?: Date,
  rangeEnd?: Date,
  frameBudgetMs = 8,
): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  let sliceStart = Date.now();

  for (const item of items) {
    const parsed = parseIcsItem(item, meta, rangeStart, rangeEnd);
    if (parsed.length) events.push(...parsed);

    if (Date.now() - sliceStart >= frameBudgetMs) {
      await yieldToUI();
      sliceStart = Date.now();
    }
  }

  return events;
}
