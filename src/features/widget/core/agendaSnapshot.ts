import type { CalendarEvent } from '@/types';
import { type AgendaDaySection, type AgendaEventItem, type AgendaSnapshot, eventDeepLink } from './types';

export interface BuildAgendaOptions {
  now?: Date;
  locale?: string;
  timeZone?: string;
  maxEvents?: number;
  days?: number;
  maxPerSection?: number;
  scheme?: 'light' | 'dark';
}

const DAY_MS = 86_400_000;

function zonedKey(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
}

function sameZonedDay(a: Date, b: Date, timeZone: string): boolean {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(a) === fmt.format(b);
}

function timeLabel(event: CalendarEvent, locale: string | undefined, tz: string): string {
  if (event.allDay) return 'All day';
  const fmt = new Intl.DateTimeFormat(locale, { timeZone: tz, hour: '2-digit', minute: '2-digit' });
  return `${fmt.format(event.dtstart)} – ${fmt.format(event.dtend)}`;
}

function toItem(event: CalendarEvent, locale: string | undefined, tz: string): AgendaEventItem {
  return {
    uid: event.uid,
    title: event.summary || '(no title)',
    startIso: event.dtstart.toISOString(),
    endIso: event.dtend.toISOString(),
    allDay: event.allDay,
    color: event.color,
    timeLabel: timeLabel(event, locale, tz),
    deepLink: eventDeepLink(event.uid),
  };
}

export function buildAgendaSnapshot(
  events: CalendarEvent[],
  {
    now = new Date(), locale, timeZone,
    maxEvents = 3, days = 0, maxPerSection = 3, scheme = 'light',
  }: BuildAgendaOptions = {},
): AgendaSnapshot {
  const tz = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const todays = events
    .filter((e) => sameZonedDay(e.dtstart, now, tz))
    .filter((e) => e.allDay || e.dtend.getTime() > now.getTime())
    .sort((a, b) => a.dtstart.getTime() - b.dtstart.getTime());

  const dayLabel = new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: 'short' })
    .format(now).toUpperCase();
  const dayNumber = new Intl.DateTimeFormat(locale, { timeZone: tz, day: 'numeric' })
    .format(now);

  const relativeLabel = todays.length > 0
    ? new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' }).format(now)
    : 'No upcoming event';

  const byKey = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const key = zonedKey(e.dtstart, tz);
    const bucket = byKey.get(key);
    if (bucket) bucket.push(e);
    else byKey.set(key, [e]);
  }

  const sections: AgendaDaySection[] = [];
  for (let i = 0; i <= days; i++) {
    const dayDate = new Date(now.getTime() + i * DAY_MS);
    const key = zonedKey(dayDate, tz);
    const isToday = i === 0;
    const dayEvents = (byKey.get(key) ?? [])
      .filter((e) => e.allDay || !isToday || e.dtend.getTime() > now.getTime())
      .sort((a, b) => a.dtstart.getTime() - b.dtstart.getTime());
    if (dayEvents.length === 0 && !isToday) continue;
    sections.push({
      dayKey: key,
      dayLabel: new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: 'short' }).format(dayDate).toUpperCase(),
      dayNumber: new Intl.DateTimeFormat(locale, { timeZone: tz, day: 'numeric' }).format(dayDate),
      weekdayLong: new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: 'long' }).format(dayDate),
      isToday,
      items: dayEvents.slice(0, maxPerSection).map((e) => toItem(e, locale, tz)),
    });
  }

  const nextEvent = sections.flatMap((s) => s.items)[0] ?? null;

  return {
    generatedAtIso: now.toISOString(),
    timeZone: tz,
    scheme,
    dayLabel,
    dayNumber,
    relativeLabel,
    events: todays.slice(0, maxEvents).map((e) => toItem(e, locale, tz)),
    sections,
    nextEvent,
  };
}
