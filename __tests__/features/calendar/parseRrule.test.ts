import { parseRrule } from '@/features/calendar/utils/parseRrule';

describe('parseRrule', () => {
  it('returns undefined for nothing to parse', () => {
    expect(parseRrule(undefined)).toBeUndefined();
    expect(parseRrule('')).toBeUndefined();
  });

  it('reads a bare frequency', () => {
    expect(parseRrule('RRULE:FREQ=WEEKLY')).toEqual({ freq: 'WEEKLY' });
  });

  it('tolerates a missing RRULE: prefix', () => {
    expect(parseRrule('FREQ=DAILY')).toEqual({ freq: 'DAILY' });
  });

  it('is case-insensitive on keys and values', () => {
    expect(parseRrule('rrule:freq=monthly')).toEqual({ freq: 'MONTHLY' });
  });

  it('reads interval, count and byDay', () => {
    expect(parseRrule('RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=10')).toEqual({
      freq: 'WEEKLY',
      interval: 2,
      byDay: ['MO', 'WE'],
      count: 10,
    });
  });

  it('reads a UTC UNTIL stamp', () => {
    const parsed = parseRrule('RRULE:FREQ=DAILY;UNTIL=20260815T093000Z');
    expect(parsed?.until?.toISOString()).toBe('2026-08-15T09:30:00.000Z');
  });

  it('reads a date-only UNTIL', () => {
    const parsed = parseRrule('RRULE:FREQ=DAILY;UNTIL=20260815');
    expect(parsed?.until?.toISOString()).toBe('2026-08-15T00:00:00.000Z');
  });

  it('round-trips every rule the app itself can write', () => {
    // rruleLine (src/utils/ics.ts) emits exactly FREQ, INTERVAL, BYDAY, and
    // COUNT or UNTIL. Anything this app creates must survive the round trip.
    const rule = { freq: 'WEEKLY' as const, interval: 3, byDay: ['TU', 'TH'], count: 5 };
    expect(parseRrule('RRULE:FREQ=WEEKLY;INTERVAL=3;BYDAY=TU,TH;COUNT=5')).toEqual(rule);
  });

  it('refuses a rule with parts the type cannot represent', () => {
    // Returning a partial rule here would silently drop BYMONTHDAY on the next
    // write — the same data loss this function exists to prevent.
    expect(parseRrule('RRULE:FREQ=MONTHLY;BYMONTHDAY=15')).toBeUndefined();
    expect(parseRrule('RRULE:FREQ=WEEKLY;WKST=SU')).toBeUndefined();
    expect(parseRrule('RRULE:FREQ=MONTHLY;BYSETPOS=-1;BYDAY=FR')).toBeUndefined();
  });

  it('refuses an unknown or missing frequency', () => {
    expect(parseRrule('RRULE:FREQ=HOURLY')).toBeUndefined();
    expect(parseRrule('RRULE:INTERVAL=2')).toBeUndefined();
  });

  it('refuses a malformed numeric part rather than guessing', () => {
    expect(parseRrule('RRULE:FREQ=DAILY;INTERVAL=abc')).toBeUndefined();
    expect(parseRrule('RRULE:FREQ=DAILY;COUNT=0')).toBeUndefined();
  });

  it('refuses a malformed UNTIL', () => {
    expect(parseRrule('RRULE:FREQ=DAILY;UNTIL=not-a-date')).toBeUndefined();
  });

  it('omits an interval of 1, matching what the writer emits', () => {
    expect(parseRrule('RRULE:FREQ=DAILY;INTERVAL=1')).toEqual({ freq: 'DAILY' });
  });

  it('refuses a rule with both COUNT and UNTIL', () => {
    // rruleLine only ever writes one of the two (`if (rule.count) ... else if
    // (rule.until)`), so a rule with both cannot be reproduced exactly: the
    // next write would silently drop UNTIL.
    expect(
      parseRrule('RRULE:FREQ=DAILY;COUNT=5;UNTIL=20260815T093000Z')
    ).toBeUndefined();
  });

  it('refuses a Z-less UNTIL date-time as floating/local, not UTC', () => {
    // Per RFC 5545 a DATE-TIME without a trailing Z is floating time, not UTC.
    // rruleLine's utcStamp always appends Z, so treating a Z-less stamp as UTC
    // would shift the recurrence end by the timezone offset on the next write.
    expect(parseRrule('RRULE:FREQ=DAILY;UNTIL=20260815T093000')).toBeUndefined();
  });

  it('still reads the date-only and Z-suffixed UNTIL forms', () => {
    expect(parseRrule('RRULE:FREQ=DAILY;UNTIL=20260815')?.until?.toISOString()).toBe(
      '2026-08-15T00:00:00.000Z'
    );
    expect(
      parseRrule('RRULE:FREQ=DAILY;UNTIL=20260815T093000Z')?.until?.toISOString()
    ).toBe('2026-08-15T09:30:00.000Z');
  });

  it('refuses a duplicate key rather than taking the last value', () => {
    expect(parseRrule('RRULE:FREQ=WEEKLY;FREQ=DAILY')).toBeUndefined();
  });
});
