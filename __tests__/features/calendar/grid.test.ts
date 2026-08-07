import {
  daysPerPage,
  dayKey,
  eventPositionStyle,
  nowTopPct,
  pageDates,
  pageFocusDate,
} from '@/features/calendar/utils/grid';

const iso = (d: Date) => dayKey(d);

describe('daysPerPage', () => {
  it('maps each mode to its page span', () => {
    expect(daysPerPage('week')).toBe(7);
    expect(daysPerPage('3days')).toBe(3);
    expect(daysPerPage('day')).toBe(1);
  });
});

describe('dayKey', () => {
  it('formats as YYYY-MM-DD in local time', () => {
    expect(dayKey(new Date(2026, 7, 7, 23, 30))).toBe('2026-08-07');
  });
});

describe('pageDates', () => {
  // 2026-08-07 is a Friday.
  const friday = new Date(2026, 7, 7);

  it('aligns a week page on Monday when weekStartsOn is 1', () => {
    const d = pageDates(friday, 0, 'week', 1);
    expect(d).toHaveLength(7);
    expect(iso(d[0])).toBe('2026-08-03');
    expect(iso(d[6])).toBe('2026-08-09');
  });

  it('aligns a week page on Sunday when weekStartsOn is 0', () => {
    const d = pageDates(friday, 0, 'week', 0);
    expect(iso(d[0])).toBe('2026-08-02');
    expect(iso(d[6])).toBe('2026-08-08');
  });

  it('pulls a Sunday back to the previous Monday when weekStartsOn is 1', () => {
    const sunday = new Date(2026, 7, 9);
    expect(iso(pageDates(sunday, 0, 'week', 1)[0])).toBe('2026-08-03');
  });

  it('shifts one week per index, in both directions', () => {
    expect(iso(pageDates(friday, 1, 'week', 1)[0])).toBe('2026-08-10');
    expect(iso(pageDates(friday, -1, 'week', 1)[0])).toBe('2026-07-27');
    expect(iso(pageDates(friday, -2, 'week', 1)[0])).toBe('2026-07-20');
  });

  it('slides 3days pages from the anchor without week alignment', () => {
    const d = pageDates(friday, 0, '3days', 1);
    expect(d.map(iso)).toEqual(['2026-08-07', '2026-08-08', '2026-08-09']);
    expect(pageDates(friday, 1, '3days', 1).map(iso)).toEqual([
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
    ]);
  });

  it('returns a single day for day mode', () => {
    expect(pageDates(friday, 0, 'day', 1).map(iso)).toEqual(['2026-08-07']);
    expect(pageDates(friday, -3, 'day', 1).map(iso)).toEqual(['2026-08-04']);
  });

  it('crosses month and year boundaries', () => {
    const dec31 = new Date(2026, 11, 31);
    expect(iso(pageDates(dec31, 1, 'day', 1)[0])).toBe('2027-01-01');
    expect(iso(pageDates(new Date(2026, 0, 1), -1, 'day', 1)[0])).toBe('2025-12-31');
  });

  it('returns dates at the start of the day', () => {
    const d = pageDates(new Date(2026, 7, 7, 17, 45), 0, 'day', 1)[0];
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});

describe('pageFocusDate', () => {
  const friday = new Date(2026, 7, 7, 9, 0);

  it('keeps the anchor when the page contains it', () => {
    expect(pageFocusDate(friday, 0, 'week', 1)).toEqual(friday);
  });

  it('falls back to the first date of the page otherwise', () => {
    expect(iso(pageFocusDate(friday, 1, 'week', 1))).toBe('2026-08-10');
    expect(iso(pageFocusDate(friday, -1, 'week', 1))).toBe('2026-07-27');
  });

  it('keeps the anchor on index 0 in day mode', () => {
    expect(pageFocusDate(friday, 0, 'day', 1)).toEqual(friday);
  });
});

const pct = (s: string) => Number.parseFloat(s.replace('%', ''));

describe('eventPositionStyle', () => {
  it('places a midnight-to-1am event at the top with 1/24 of the height', () => {
    const s = eventPositionStyle(new Date(2026, 7, 7, 0, 0), new Date(2026, 7, 7, 1, 0));
    expect(pct(s.top)).toBeCloseTo(0, 6);
    expect(pct(s.height)).toBeCloseTo((100 * 60) / 1440, 6);
  });

  it('places a 09:30-10:15 event by minutes from midnight', () => {
    const s = eventPositionStyle(new Date(2026, 7, 7, 9, 30), new Date(2026, 7, 7, 10, 15));
    expect(pct(s.top)).toBeCloseTo((100 * 570) / 1440, 6);
    expect(pct(s.height)).toBeCloseTo((100 * 45) / 1440, 6);
  });

  it('keeps a 5-minute event proportionally small rather than clamping it', () => {
    const s = eventPositionStyle(new Date(2026, 7, 7, 14, 0), new Date(2026, 7, 7, 14, 5));
    expect(pct(s.height)).toBeCloseTo((100 * 5) / 1440, 6);
  });

  it('lets an event ending at midnight reach the bottom', () => {
    const s = eventPositionStyle(new Date(2026, 7, 7, 23, 0), new Date(2026, 7, 8, 0, 0));
    expect(pct(s.top)).toBeCloseTo((100 * 1380) / 1440, 6);
    expect(pct(s.top) + pct(s.height)).toBeCloseTo(100, 6);
  });

  it('returns percentage strings', () => {
    const s = eventPositionStyle(new Date(2026, 7, 7, 8, 0), new Date(2026, 7, 7, 9, 0));
    expect(s.top.endsWith('%')).toBe(true);
    expect(s.height.endsWith('%')).toBe(true);
  });
});

describe('nowTopPct', () => {
  it('is 0 at midnight and 50 at noon', () => {
    expect(nowTopPct(new Date(2026, 7, 7, 0, 0))).toBeCloseTo(0, 6);
    expect(nowTopPct(new Date(2026, 7, 7, 12, 0))).toBeCloseTo(50, 6);
  });
});
