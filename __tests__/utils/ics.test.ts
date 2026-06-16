import { buildIcs, buildAllDayIcs } from '../../src/utils/ics';
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

  it('emits DTSTART and DTEND with TZID in the given timezone', () => {
    const ics = buildIcs(base);
    expect(ics).toContain('DTSTART;TZID=UTC:20260601T140000\r\n');
    expect(ics).toContain('DTEND;TZID=UTC:20260601T150000\r\n');
  });

  it('converts UTC dates to local time when timezone is Europe/Paris (UTC+2 in June)', () => {
    const ics = buildIcs({ ...base, timezone: 'Europe/Paris' });
    expect(ics).toContain('DTSTART;TZID=Europe/Paris:20260601T160000\r\n');
    expect(ics).toContain('DTEND;TZID=Europe/Paris:20260601T170000\r\n');
  });

  it('encodes UID correctly', () => {
    expect(buildIcs(base)).toContain('UID:test-uid-123\r\n');
  });

  it('includes ORGANIZER with mailto', () => {
    expect(buildIcs(base)).toContain('ORGANIZER;CN=John Doe:mailto:john@example.com\r\n');
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
    date: new Date('2026-06-15T00:00:00Z'),
    organizerEmail: 'john@example.com',
    organizerName: 'John Doe',
    attendees: [] as Attendee[],
  };

  it('uses DATE value type for DTSTART and DTEND', () => {
    const ics = buildAllDayIcs(allDayBase);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260615\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20260616\r\n');
  });

  it('does not contain a TZID in DTSTART', () => {
    const ics = buildAllDayIcs(allDayBase);
    expect(ics).not.toContain('TZID');
  });
});
