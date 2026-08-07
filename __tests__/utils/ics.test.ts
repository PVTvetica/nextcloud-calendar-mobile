import { buildIcs, buildAllDayIcs } from '@/utils/ics';
import type { Attendee } from '../../src/types';

const base = {
  uid: 'test-uid-123',
  summary: 'Team Sync',
  description: 'Weekly sync',
  location: 'https://cloud.example.com/call/abc123',
  dtstart: new Date('2026-06-01T14:00:00Z'),
  dtend: new Date('2026-06-01T15:00:00Z'),
  organizerEmail: 'john@example.com',
  organizerName: 'John Doe',
  attendees: [] as Attendee[],
  timezone: 'UTC',
};

describe('buildIcs', () => {
  it('produces valid VCALENDAR/VEVENT structure', () => {
    const ics = buildIcs(base);
    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics).toContain('BEGIN:VEVENT\r\n');
    expect(ics).toContain('END:VEVENT\r\n');
    expect(ics).toContain('END:VCALENDAR\r\n');
  });

  it('writes non-recurring timed events with TZID, like recurring ones', () => {
    const ics = buildIcs({ ...base, timezone: 'Europe/Paris' });
    expect(ics).toContain('DTSTART;TZID=Europe/Paris:20260601T160000\r\n');
    expect(ics).toContain('DTEND;TZID=Europe/Paris:20260601T170000\r\n');
  });

  it('recurring events keep their anchor zone via TZID', () => {
    const ics = buildIcs({ ...base, timezone: 'Europe/Paris', rrule: { freq: 'WEEKLY' } });
    expect(ics).toContain('DTSTART;TZID=Europe/Paris:20260601T160000\r\n');
    expect(ics).toContain('DTEND;TZID=Europe/Paris:20260601T170000\r\n');
    expect(ics).toContain('RRULE:FREQ=WEEKLY\r\n');
  });

  it('encodes UID correctly', () => {
    expect(buildIcs(base)).toContain('UID:test-uid-123\r\n');
  });

  it('includes ORGANIZER with mailto once somebody is invited', () => {
    const ics = buildIcs({ ...base, attendees: [{ email: 'alice@example.com' }] });
    expect(ics).toContain('ORGANIZER;CN=John Doe:mailto:john@example.com\r\n');
  });

  it('omits ORGANIZER on a solo event so calendar co-editors keep write access', () => {
    expect(buildIcs(base)).not.toContain('ORGANIZER');
    expect(buildAllDayIcs(base)).not.toContain('ORGANIZER');
  });

  it('defaults SEQUENCE to 0 and carries the given one', () => {
    expect(buildIcs(base)).toContain('SEQUENCE:0\r\n');
    expect(buildIcs({ ...base, sequence: 3 })).toContain('SEQUENCE:3\r\n');
    expect(buildAllDayIcs({ ...base, sequence: 2 })).toContain('SEQUENCE:2\r\n');
  });

  it('includes ATTENDEE lines with RSVP=TRUE', () => {
    const ics = buildIcs({
      ...base,
      attendees: [{ email: 'alice@example.com', displayName: 'Alice' }],
    });
    expect(ics).toContain('RSVP=TRUE');
    expect(ics).toContain('mailto:alice@example.com');
    expect(ics).toContain('CN=Alice');
  });

  it('escapes special chars in summary', () => {
    const ics = buildIcs({ ...base, summary: 'Sync, Team; All' });
    expect(ics).toContain('SUMMARY:Sync\\, Team\\; All\r\n');
  });

  it('folds lines longer than 75 bytes', () => {
    const longSummary = 'A'.repeat(100);
    const ics = buildIcs({ ...base, summary: longSummary });
    const lines = ics.split('\r\n');
    const summaryLine = lines.find((l) => l.startsWith('SUMMARY'));
    expect(summaryLine).toBeDefined();
    const summaryBytes = new TextEncoder().encode(summaryLine!).length;
    expect(summaryBytes).toBeLessThanOrEqual(75);
  });

  it('omits DESCRIPTION when empty', () => {
    const ics = buildIcs({ ...base, description: '' });
    expect(ics).not.toContain('DESCRIPTION');
  });

  it('omits LOCATION when empty', () => {
    const ics = buildIcs({ ...base, location: '' });
    expect(ics).not.toContain('LOCATION');
  });
});

describe('buildAllDayIcs', () => {
  const allDayBase = {
    uid: 'allday-uid',
    summary: 'Holiday',
    description: '',
    location: '',
    dtstart: new Date(2026, 5, 15),
    dtend: new Date(2026, 5, 15),
    organizerEmail: 'john@example.com',
    organizerName: 'John Doe',
    attendees: [] as Attendee[],
  };

  it('uses DATE value type for DTSTART and exclusive DTEND (single day)', () => {
    const ics = buildAllDayIcs(allDayBase);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260615\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20260616\r\n');
  });

  it('writes exclusive DTEND one day after the inclusive end (multi-day)', () => {
    const ics = buildAllDayIcs({ ...allDayBase, dtend: new Date(2026, 5, 17) });
    expect(ics).toContain('DTSTART;VALUE=DATE:20260615\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20260618\r\n');
  });

  it('rolls the exclusive DTEND across a year boundary (Dec 31 -> Jan 1)', () => {
    const ics = buildAllDayIcs({
      ...allDayBase,
      dtstart: new Date(2026, 11, 31),
      dtend: new Date(2026, 11, 31),
    });
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20270101\r\n');
  });

  it('does not contain a TZID in DTSTART', () => {
    const ics = buildAllDayIcs(allDayBase);
    expect(ics).not.toContain('TZID');
  });
});
