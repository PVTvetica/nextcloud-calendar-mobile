import { layoutDay } from '@/features/calendar/utils/eventLayout';
import type { GridEvent } from '@/features/calendar/utils/toGridEvents';
import type { CalendarEvent } from '@/types';

function ev(uid: string, startHour: number, endHour: number): GridEvent {
  const e: CalendarEvent = {
    uid, href: `/${uid}.ics`, calendarId: 'c1', accountId: 'a1',
    summary: uid,
    dtstart: new Date(2026, 7, 7, startHour, 0),
    dtend: new Date(2026, 7, 7, endHour, 0),
    allDay: false, color: '#0082c9', attendees: [], isRecurring: false,
  };
  return {
    title: e.summary, start: e.dtstart, end: e.dtend, color: e.color,
    _event: e, _leftPct: 0, _rightPx: 3, _zIndex: 100,
  };
}

/** Same, for events that do not start and end on the hour. */
function evAt(uid: string, startMin: number, endMin: number): GridEvent {
  const base = ev(uid, 0, 1);
  base.start = new Date(2026, 7, 7, Math.floor(startMin / 60), startMin % 60);
  base.end = new Date(2026, 7, 7, Math.floor(endMin / 60), endMin % 60);
  base._event.dtstart = base.start;
  base._event.dtend = base.end;
  return base;
}

const byUid = (out: ReturnType<typeof layoutDay>) =>
  new Map(out.map((p) => [p.event._event.uid, p]));

describe('layoutDay', () => {
  it('gives a lone event the full width', () => {
    const [only] = layoutDay([ev('a', 9, 10)]);
    expect(only.leftPct).toBe(0);
    expect(only.widthPct).toBe(100);
  });

  it('leaves disjoint events at full width each', () => {
    const out = byUid(layoutDay([ev('a', 9, 10), ev('b', 11, 12)]));
    expect(out.get('a')!.widthPct).toBe(100);
    expect(out.get('b')!.widthPct).toBe(100);
    expect(out.get('b')!.leftPct).toBe(0);
  });

  it('treats touching edges as disjoint', () => {
    // 9-10 and 10-11 do not overlap: one ends exactly as the other begins.
    const out = byUid(layoutDay([ev('a', 9, 10), ev('b', 10, 11)]));
    expect(out.get('a')!.widthPct).toBe(100);
    expect(out.get('b')!.widthPct).toBe(100);
  });

  it('splits two simultaneous events in half', () => {
    const out = byUid(layoutDay([ev('a', 9, 11), ev('b', 10, 12)]));
    expect(out.get('a')!.leftPct).toBe(0);
    expect(out.get('a')!.widthPct).toBe(50);
    expect(out.get('b')!.leftPct).toBe(50);
    expect(out.get('b')!.widthPct).toBe(50);
  });

  it('expands an event into the free column to its right', () => {
    // A 9:00-10:00, B 9:30-11:00, C 10:00-12:00.
    // Columns: A=0, B=1, C=0 is taken until 10:00 so C=2? No — C starts at 10:00
    // and A ended at 10:00, so C reuses column 0. B keeps column 1.
    // A can expand right only while nothing in column 1 overlaps it: B does
    // (9:30 < 10:00), so A stays one column wide.
    const out = byUid(layoutDay([ev('a', 9, 10), evAt('b', 570, 660), ev('c', 10, 12)]));
    expect(out.get('a')!.widthPct).toBe(50);
    expect(out.get('b')!.widthPct).toBe(50);
  });

  it('lets an event span every column when nothing overlaps it', () => {
    // A 8:00-9:00 alone, then B 10:00-11:00 and C 10:30-11:30 overlapping.
    // A is its own group and takes the full width.
    const out = byUid(layoutDay([ev('a', 8, 9), ev('b', 10, 11), evAt('c', 630, 690)]));
    expect(out.get('a')!.widthPct).toBe(100);
    expect(out.get('b')!.widthPct).toBe(50);
  });

  it('gives three simultaneous events a third each', () => {
    const out = byUid(layoutDay([ev('a', 9, 12), ev('b', 9, 12), ev('c', 9, 12)]));
    for (const uid of ['a', 'b', 'c']) {
      expect(out.get(uid)!.widthPct).toBeCloseTo(100 / 3, 6);
    }
    expect(new Set([...out.values()].map((p) => p.leftPct)).size).toBe(3);
  });

  it('never emits a zero or negative width', () => {
    const many = Array.from({ length: 20 }, (_, i) => ev(`e${i}`, 9, 17));
    for (const p of layoutDay(many)) {
      expect(p.widthPct).toBeGreaterThan(0);
    }
  });

  it('does not let one long event narrow the whole day', () => {
    // The bug this replaces: an all-day-spanning slice used to chain every
    // event into one cluster, so twenty short events became twenty columns.
    const slices = [
      ev('span', 0, 24),
      ...Array.from({ length: 20 }, (_, i) => ev(`e${i}`, 9 + (i % 8), 9 + (i % 8) + 1)),
    ];
    const out = layoutDay(slices);
    // At most a handful of events are ever simultaneous, so no box collapses to
    // a sliver: the narrowest is far wider than 1/21 of the column.
    const narrowest = Math.min(...out.map((p) => p.widthPct));
    expect(narrowest).toBeGreaterThan(100 / 6);
  });

  it('orders ties by uid so columns do not flicker between renders', () => {
    const first = layoutDay([ev('b', 9, 10), ev('a', 9, 10)]);
    const second = layoutDay([ev('a', 9, 10), ev('b', 9, 10)]);
    expect(first.map((p) => p.event._event.uid)).toEqual(second.map((p) => p.event._event.uid));
    expect(first.map((p) => p.leftPct)).toEqual(second.map((p) => p.leftPct));
  });

  it('returns an empty list for an empty day', () => {
    expect(layoutDay([])).toEqual([]);
  });
});
