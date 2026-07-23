import type { Attendee, RecurrenceRule } from '@/types';

const PRODID = '-//Nextcloud Calendar Mobile//EN';

function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line + '\r\n';
  let offset = 0;
  let result = '';
  while (offset < bytes.length) {
    const chunk = bytes.slice(offset, offset + 75);
    result += new TextDecoder().decode(chunk);
    offset += 75;
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

function textLines(summary: string, description: string, location: string): string[] {
  return [
    `SUMMARY:${esc(summary)}`,
    ...(description ? [`DESCRIPTION:${esc(description)}`] : []),
    ...(location ? [`LOCATION:${esc(location)}`] : []),
  ];
}

function organizerLine(name: string, email: string): string {
  return `ORGANIZER;CN=${name}:mailto:${email}`;
}

function attendeeLines(attendees: Attendee[]): string[] {
  return attendees.map((att) => {
    const cn = att.displayName ? `;CN=${att.displayName}` : '';
    return `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;RSVP=TRUE;PARTSTAT=NEEDS-ACTION${cn}:mailto:${att.email}`;
  });
}

function serialize(veventBody: string[]): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
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
}

export function buildIcs(params: BuildIcsParams): string {
  const { uid, summary, description, location, dtstart, dtend, organizerEmail, organizerName, attendees, timezone, rrule } = params;

  return serialize([
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART;TZID=${timezone}:${localStamp(dtstart, timezone)}`,
    `DTEND;TZID=${timezone}:${localStamp(dtend, timezone)}`,
    ...textLines(summary, description, location),
    ...(rrule ? [rruleLine(rrule)] : []),
    organizerLine(organizerName, organizerEmail),
    ...attendeeLines(attendees),
  ]);
}

export type BuildAllDayIcsParams = Omit<BuildIcsParams, 'timezone'>;

export function buildAllDayIcs(params: BuildAllDayIcsParams): string {
  const { uid, summary, description, location, dtstart, dtend, organizerEmail, organizerName, attendees, rrule } = params;
  const endExclusive = new Date(dtend.getFullYear(), dtend.getMonth(), dtend.getDate() + 1);

  return serialize([
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART;VALUE=DATE:${dateStamp(dtstart)}`,
    `DTEND;VALUE=DATE:${dateStamp(endExclusive)}`,
    ...textLines(summary, description, location),
    ...(rrule ? [rruleLine(rrule)] : []),
    organizerLine(organizerName, organizerEmail),
    ...attendeeLines(attendees),
  ]);
}

export function buildExceptionIcs(params: BuildIcsParams & { recurrenceId: Date }): string {
  const { uid, summary, description, location, dtstart, dtend, organizerEmail, organizerName, attendees, timezone, recurrenceId } = params;

  return serialize([
    `UID:${uid}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `RECURRENCE-ID;TZID=${timezone}:${localStamp(recurrenceId, timezone)}`,
    `DTSTART;TZID=${timezone}:${localStamp(dtstart, timezone)}`,
    `DTEND;TZID=${timezone}:${localStamp(dtend, timezone)}`,
    ...textLines(summary, description, location),
    organizerLine(organizerName, organizerEmail),
    ...attendeeLines(attendees),
  ]);
}

export function injectExdate(masterIcs: string, occurrenceDtstart: Date, timezone: string): string {
  const exdateLine = `EXDATE;TZID=${timezone}:${localStamp(occurrenceDtstart, timezone)}`;
  return masterIcs.replace(/(END:VEVENT)/, `${exdateLine}\r\n$1`);
}

export function truncateRruleUntil(masterIcs: string, newUntil: Date): string {
  return masterIcs
    .replace(/(RRULE:[^\r\n]*);(UNTIL|COUNT)=[^\r\n;]*/g, '$1')
    .replace(/(RRULE:[^\r\n]*)/, `$1;UNTIL=${utcStamp(newUntil)}`);
}
