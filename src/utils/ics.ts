import ICAL from 'ical.js';

import type { Attendee, RecurrenceRule } from '@/types';
import { minutesToTrigger } from '@/features/notifications/alerts';
import { buildVtimezone } from '@/utils/timezone';
import { propInstant } from '@/utils/caldav-parse';

const PRODID = '-//Nextcloud Calendar Mobile//EN';

function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line + '\r\n';

  const decoder = new TextDecoder();
  let offset = 0;
  let result = '';
  while (offset < bytes.length) {
    const limit = offset === 0 ? 75 : 74;
    let end = Math.min(offset + limit, bytes.length);
    while (end > offset + 1 && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end -= 1;
    result += decoder.decode(bytes.slice(offset, end));
    offset = end;
    if (offset < bytes.length) result += '\r\n ';
  }
  return result + '\r\n';
}

function esc(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function dateStamp(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

const TZ_STAMP_FMT = new Map<string, Intl.DateTimeFormat>();

function localStamp(date: Date, timezone: string): string {
  let fmt = TZ_STAMP_FMT.get(timezone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    TZ_STAMP_FMT.set(timezone, fmt);
  }
  const parts = fmt.formatToParts(date);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${g('year')}${g('month')}${g('day')}T${g('hour')}${g('minute')}${g('second')}`;
}

function rruleLine(rule: RecurrenceRule): string {
  const parts: string[] = [`FREQ=${rule.freq}`];
  if (rule.interval && rule.interval > 1) parts.push(`INTERVAL=${rule.interval}`);
  if (rule.byDay && rule.byDay.length > 0) parts.push(`BYDAY=${rule.byDay.join(',')}`);
  if (rule.count) parts.push(`COUNT=${rule.count}`);
  else if (rule.until) parts.push(`UNTIL=${utcStamp(rule.until)}`);
  return `RRULE:${parts.join(';')}`;
}

function parseIcsStamp(value: string): Date | undefined {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/.exec(value.trim());
  if (!m) return undefined;
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
}

export function parseRruleString(value: string | undefined): RecurrenceRule | undefined {
  if (!value) return undefined;

  const params = new Map<string, string>();
  for (const segment of value.replace(/^RRULE:/i, '').split(';')) {
    const i = segment.indexOf('=');
    if (i > 0) params.set(segment.slice(0, i).toUpperCase(), segment.slice(i + 1));
  }

  const freq = params.get('FREQ')?.toUpperCase();
  if (freq !== 'DAILY' && freq !== 'WEEKLY' && freq !== 'MONTHLY' && freq !== 'YEARLY') {
    return undefined;
  }

  const rule: RecurrenceRule = { freq };

  const interval = Number(params.get('INTERVAL'));
  if (Number.isFinite(interval) && interval > 1) rule.interval = interval;

  const count = Number(params.get('COUNT'));
  if (Number.isFinite(count) && count > 0) rule.count = count;

  const until = params.get('UNTIL');
  if (until) {
    const parsed = parseIcsStamp(until);
    if (parsed) rule.until = parsed;
  }

  const byDay = params.get('BYDAY');
  if (byDay) {
    const days = byDay.split(',').map((d) => d.trim()).filter(Boolean);
    if (days.length > 0) rule.byDay = days;
  }

  return rule;
}

function textLines(summary: string, description: string, location: string): string[] {
  return [
    `SUMMARY:${esc(summary)}`,
    ...(description ? [`DESCRIPTION:${esc(description)}`] : []),
    ...(location ? [`LOCATION:${esc(location)}`] : []),
  ];
}

function alarmLines(alarmMinutes?: number): string[] {
  if (alarmMinutes === undefined) return [];
  return [
    'BEGIN:VALARM',
    `TRIGGER:${minutesToTrigger(alarmMinutes)}`,
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'END:VALARM',
  ];
}

function param(value: string): string {
  const clean = value.replace(/["\r\n]/g, ' ').trim();
  return /[,;:]/.test(clean) ? `"${clean}"` : clean;
}

function organizerLine(name: string, email: string): string {
  const cn = name ? `;CN=${param(name)}` : '';
  return `ORGANIZER${cn}:mailto:${email}`;
}

function attendeeLines(attendees: Attendee[]): string[] {
  return attendees.map((att) => {
    const cn = att.displayName ? `;CN=${param(att.displayName)}` : '';
    return `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;RSVP=TRUE;PARTSTAT=NEEDS-ACTION;SCHEDULE-AGENT=SERVER${cn}:mailto:${att.email}`;
  });
}

export function nextSequence(): number {
  return Math.floor((Date.now() - Date.UTC(2020, 0, 1)) / 1000);
}

function serialize(veventBody: string[], timezone?: string, ref?: Date): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    ...(timezone && ref ? buildVtimezone(timezone, ref) : []),
    'BEGIN:VEVENT',
    ...veventBody,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .map(foldLine)
    .join('');
}

export interface BuildIcsParams {
  uid: string;
  summary: string;
  description: string;
  location: string;
  dtstart: Date;
  dtend: Date;
  organizerEmail: string;
  organizerName: string;
  attendees: Attendee[];
  timezone: string;
  rrule?: RecurrenceRule;
  alarmMinutes?: number;
  sequence?: number;
}

export function buildIcs(params: BuildIcsParams): string {
  const { uid, summary, description, location, dtstart, dtend, organizerEmail, organizerName, attendees, timezone, rrule, alarmMinutes, sequence = 0 } = params;

  return serialize([
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `SEQUENCE:${sequence}`,
    `DTSTART;TZID=${timezone}:${localStamp(dtstart, timezone)}`,
    `DTEND;TZID=${timezone}:${localStamp(dtend, timezone)}`,
    ...textLines(summary, description, location),
    ...(rrule ? [rruleLine(rrule)] : []),
    organizerLine(organizerName, organizerEmail),
    ...attendeeLines(attendees),
    ...alarmLines(alarmMinutes),
  ], timezone, dtstart);
}

export type BuildAllDayIcsParams = Omit<BuildIcsParams, 'timezone'>;

export function buildAllDayIcs(params: BuildAllDayIcsParams): string {
  const { uid, summary, description, location, dtstart, dtend, organizerEmail, organizerName, attendees, rrule, alarmMinutes, sequence = 0 } = params;
  const endExclusive = new Date(dtend.getFullYear(), dtend.getMonth(), dtend.getDate() + 1);

  return serialize([
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `SEQUENCE:${sequence}`,
    `DTSTART;VALUE=DATE:${dateStamp(dtstart)}`,
    `DTEND;VALUE=DATE:${dateStamp(endExclusive)}`,
    ...textLines(summary, description, location),
    ...(rrule ? [rruleLine(rrule)] : []),
    organizerLine(organizerName, organizerEmail),
    ...attendeeLines(attendees),
    ...alarmLines(alarmMinutes),
  ]);
}

export function buildExceptionIcs(
  params: Omit<BuildIcsParams, 'timezone'> & { timezone?: string; recurrenceId: Date },
): string {
  const { uid, summary, description, location, dtstart, dtend, organizerEmail, organizerName, attendees, timezone, recurrenceId, alarmMinutes, sequence = 0 } = params;

  const stamp = (date: Date) =>
    timezone ? `;TZID=${timezone}:${localStamp(date, timezone)}` : `:${utcStamp(date)}`;

  return serialize([
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `SEQUENCE:${sequence}`,
    `RECURRENCE-ID${stamp(recurrenceId)}`,
    `DTSTART${stamp(dtstart)}`,
    `DTEND${stamp(dtend)}`,
    ...textLines(summary, description, location),
    organizerLine(organizerName, organizerEmail),
    ...attendeeLines(attendees),
    ...alarmLines(alarmMinutes),
  ], timezone, dtstart);
}


export function upsertOverride(masterIcs: string, overrideIcs: string): string {
  const master = new ICAL.Component(ICAL.parse(masterIcs));
  const overrideCal = new ICAL.Component(ICAL.parse(overrideIcs));
  const override = overrideCal.getFirstSubcomponent('vevent');
  if (!override) return masterIcs;

  const knownZones = new Set(
    master.getAllSubcomponents('vtimezone').map((tz) => String(tz.getFirstPropertyValue('tzid'))),
  );
  for (const zone of overrideCal.getAllSubcomponents('vtimezone')) {
    const tzid = String(zone.getFirstPropertyValue('tzid'));
    if (knownZones.has(tzid)) continue;
    master.addSubcomponent(zone);
    knownZones.add(tzid);
  }

  const recurrenceId = override.getFirstPropertyValue('recurrence-id');
  if (!(recurrenceId instanceof ICAL.Time)) return masterIcs;
  const key = recurrenceId.toJSDate().getTime();

  for (const vevent of master.getAllSubcomponents('vevent')) {
    const existing = vevent.getFirstPropertyValue('recurrence-id');
    if (existing instanceof ICAL.Time && existing.toJSDate().getTime() === key) {
      master.removeSubcomponent(vevent);
    }
  }

  master.addSubcomponent(override);
  return master.toString();
}

type DateForm = { kind: 'date' } | { kind: 'utc' } | { kind: 'tzid'; tzid: string };

function dateFormOf(prop: ICAL.Property): DateForm {
  const tzid = prop.getParameter('tzid');
  if (typeof tzid === 'string' && tzid) return { kind: 'tzid', tzid };
  const value = prop.getFirstValue();
  if (value instanceof ICAL.Time && value.isDate) return { kind: 'date' };
  return { kind: 'utc' };
}

function dateTimeProperty(name: string, date: Date, form: DateForm): ICAL.Property {
  const line =
    form.kind === 'date' ? `${name};VALUE=DATE:${dateStamp(date)}`
    : form.kind === 'tzid' ? `${name};TZID=${form.tzid}:${localStamp(date, form.tzid)}`
    : `${name}:${utcStamp(date)}`;
  return ICAL.Property.fromString(line);
}

function replaceLines(vevent: ICAL.Component, name: string, lines: string[]): void {
  vevent.removeAllProperties(name);
  for (const line of lines) vevent.addProperty(ICAL.Property.fromString(line));
}

function shiftProperty(vevent: ICAL.Component, name: string, shiftMs: number): void {
  const prop = vevent.getFirstProperty(name);
  const at = propInstant(vevent, name);
  if (!prop || !at) return;
  const moved = dateTimeProperty(name.toUpperCase(), new Date(at.getTime() + shiftMs), dateFormOf(prop));
  vevent.removeAllProperties(name);
  vevent.addProperty(moved);
}

export interface MasterEdit {
  summary: string;
  description: string;
  location: string;
  shiftMs: number;
  startAt?: Date;
  uid?: string;
  durationMs: number;
  organizerEmail: string;
  organizerName: string;
  attendees: Attendee[];
  alarmMinutes?: number;
  sequence: number;
}

export function applyMasterEdit(masterIcs: string, edit: MasterEdit): string {
  const calendar = new ICAL.Component(ICAL.parse(masterIcs));
  const vevents = calendar.getAllSubcomponents('vevent');

  const master = vevents.find((v) => !v.getFirstPropertyValue('recurrence-id'));
  const startProp = master?.getFirstProperty('dtstart');
  const start = master ? propInstant(master, 'dtstart') : undefined;
  if (!master || !startProp || !start) return masterIcs;

  const form = dateFormOf(startProp);
  const newStart = edit.startAt ?? new Date(start.getTime() + edit.shiftMs);
  const { shiftMs } = edit;

  for (const vevent of vevents) {
    if (edit.uid) replaceLines(vevent, 'uid', [`UID:${edit.uid}`]);

    if (vevent !== master) {
      shiftProperty(vevent, 'recurrence-id', shiftMs);
      shiftProperty(vevent, 'dtstart', shiftMs);
      shiftProperty(vevent, 'dtend', shiftMs);
      const at = propInstant(vevent, 'recurrence-id');
      if (at && at < newStart) calendar.removeSubcomponent(vevent);
      continue;
    }

    replaceLines(vevent, 'dtstart', []);
    vevent.addProperty(dateTimeProperty('DTSTART', newStart, form));
    replaceLines(vevent, 'dtend', []);
    vevent.addProperty(
      dateTimeProperty('DTEND', new Date(newStart.getTime() + edit.durationMs), form),
    );

    for (const exdate of vevent.getAllProperties('exdate')) {
      const at = exdate.getFirstValue();
      if (!(at instanceof ICAL.Time)) continue;
      const moved = new Date(at.toJSDate().getTime() + shiftMs);
      vevent.removeProperty(exdate);
      if (moved >= newStart) vevent.addProperty(dateTimeProperty('EXDATE', moved, dateFormOf(exdate)));
    }

    const rruleProp = vevent.getFirstProperty('rrule');
    const recur = rruleProp?.getFirstValue();
    if (rruleProp && recur instanceof ICAL.Recur && recur.until) {
      recur.until = ICAL.Time.fromJSDate(
        new Date(recur.until.toJSDate().getTime() + shiftMs), true,
      );
      rruleProp.setValue(recur);
    }

    replaceLines(vevent, 'summary', [`SUMMARY:${esc(edit.summary)}`]);
    replaceLines(vevent, 'description', edit.description ? [`DESCRIPTION:${esc(edit.description)}`] : []);
    replaceLines(vevent, 'location', edit.location ? [`LOCATION:${esc(edit.location)}`] : []);
    replaceLines(vevent, 'organizer', [organizerLine(edit.organizerName, edit.organizerEmail)]);
    replaceLines(vevent, 'attendee', attendeeLines(edit.attendees));
    replaceLines(vevent, 'sequence', [`SEQUENCE:${edit.sequence}`]);
    replaceLines(vevent, 'dtstamp', [`DTSTAMP:${utcStamp(new Date())}`]);

    vevent.removeAllSubcomponents('valarm');
    const alarm = alarmLines(edit.alarmMinutes);
    if (alarm.length > 0) vevent.addSubcomponent(ICAL.Component.fromString(alarm.join('\r\n')));
  }

  return calendar.toString();
}

export function resolveRecurrenceId(masterIcs: string, occurrenceStart: Date): Date {
  const TOLERANCE_MS = 60_000;
  try {
    const master = new ICAL.Component(ICAL.parse(masterIcs));
    for (const vevent of master.getAllSubcomponents('vevent')) {
      const recurrenceId = vevent.getFirstPropertyValue('recurrence-id');
      const dtstart = vevent.getFirstPropertyValue('dtstart');
      if (!(recurrenceId instanceof ICAL.Time) || !(dtstart instanceof ICAL.Time)) continue;
      const drift = Math.abs(dtstart.toJSDate().getTime() - occurrenceStart.getTime());
      if (drift < TOLERANCE_MS) return recurrenceId.toJSDate();
    }
  } catch {
  }
  return occurrenceStart;
}


export function injectExdate(
  masterIcs: string,
  occurrenceDtstart: Date,
  timezone: string | undefined,
): string {
  const exdateLine = timezone
    ? `EXDATE;TZID=${timezone}:${localStamp(occurrenceDtstart, timezone)}`
    : `EXDATE:${utcStamp(occurrenceDtstart)}`;
  return masterIcs.replace(/(END:VEVENT)/, `${exdateLine}\r\n$1`);
}


export function truncateRruleUntil(masterIcs: string, newUntil: Date): string | null {
  const master = new ICAL.Component(ICAL.parse(masterIcs));
  const until = ICAL.Time.fromJSDate(newUntil, true);

  for (const vevent of master.getAllSubcomponents('vevent')) {
    const recurrenceId = vevent.getFirstPropertyValue('recurrence-id');
    if (recurrenceId instanceof ICAL.Time) {
      if (recurrenceId.toJSDate() > newUntil) master.removeSubcomponent(vevent);
      continue;
    }

    const start = propInstant(vevent, 'dtstart');
    if (start && start > newUntil) return null;

    const prop = vevent.getFirstProperty('rrule');
    const recur = prop?.getFirstValue();
    if (!prop || !(recur instanceof ICAL.Recur)) continue;
    recur.count = null;
    recur.until = until;
    prop.setValue(recur);
  }

  return master.toString();
}
