import { layoutDay, MIN_EVENT_WIDTH_PCT } from '@/features/calendar/utils/eventLayout';
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
    _event: e,
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

  it('legitimately expands an event when freed columns do not overlap it', () => {
    // A 9:00-10:00, B 9:00-10:00, D 9:30-10:30, C 10:00-11:00.
    // D chains A/B to C (all in one group). Columns: A=0, B=1, D=2, C=0 (after A).
    // C at 10:00-11:00 does not overlap B (ends at 10:00) or A (ends at 10:00),
    // so C can expand into columns 1 and 2. Expansion blocked only by D (9:30 < 11:00).
    // C expands to 66.67%, which clears the floor. A, B, D each span 1 column
    // (33.3%), below the floor, so they go dense at the floor independently.
    const out = byUid(layoutDay([ev('a', 9, 10), ev('b', 9, 10), evAt('d', 570, 630), ev('c', 10, 11)]));
    expect(out.get('c')!.leftPct).toBe(0);
    expect(out.get('c')!.widthPct).toBeCloseTo(100 * (2 / 3), 6);
    expect(out.get('a')!.widthPct).toBe(MIN_EVENT_WIDTH_PCT);
    expect(out.get('b')!.widthPct).toBe(MIN_EVENT_WIDTH_PCT);
    expect(out.get('d')!.widthPct).toBe(MIN_EVENT_WIDTH_PCT);
  });

  it('lets an event span every column when nothing overlaps it', () => {
    // A 8:00-9:00 alone, then B 10:00-11:00 and C 10:30-11:30 overlapping.
    // A is its own group and takes the full width.
    const out = byUid(layoutDay([ev('a', 8, 9), ev('b', 10, 11), evAt('c', 630, 690)]));
    expect(out.get('a')!.widthPct).toBe(100);
    expect(out.get('b')!.widthPct).toBe(50);
  });

  it('stacks three simultaneous events at distinct positions', () => {
    // Three columns would be 33.3% each, below MIN_EVENT_WIDTH_PCT, so they
    // hold the floor and overlap instead of shrinking — each still exposes a
    // distinct strip, so none is hidden.
    const out = byUid(layoutDay([ev('a', 9, 12), ev('b', 9, 12), ev('c', 9, 12)]));
    for (const uid of ['a', 'b', 'c']) {
      expect(out.get(uid)!.widthPct).toBe(MIN_EVENT_WIDTH_PCT);
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

  // Ported from the old per-cluster overlap test suite: zIndex = 100 + column,
  // and nothing in the tests above pinned that down.
  it('assigns the base zIndex to a lone event', () => {
    const out = byUid(layoutDay([ev('a', 9, 10), ev('b', 11, 12)]));
    expect(out.get('a')!.zIndex).toBe(100);
    expect(out.get('b')!.zIndex).toBe(100);
  });

  it('increments zIndex per column for overlapping events', () => {
    const out = byUid(layoutDay([evAt('a', 540, 630), evAt('b', 600, 660)]));
    expect(out.get('a')!.zIndex).toBe(100);
    expect(out.get('b')!.zIndex).toBe(101);
  });

  // Ported from the old per-cluster overlap test suite: a-b overlap, b-c
  // overlap, but a and c do not overlap each other. The three still chain
  // into one group, and c reuses a's column once it frees up at 10:00.
  it('reuses a freed column across a chain even when its endpoints are disjoint', () => {
    const out = byUid(layoutDay([ev('a', 9, 10), evAt('b', 570, 660), evAt('c', 630, 690)]));
    expect(out.get('a')!.leftPct).toBe(0);
    expect(out.get('b')!.leftPct).toBe(50);
    expect(out.get('c')!.leftPct).toBe(0);
    expect(out.get('a')!.widthPct).toBe(50);
    expect(out.get('b')!.widthPct).toBe(50);
    expect(out.get('c')!.widthPct).toBe(50);
  });
});

describe('layoutDay dense stacking', () => {
  const simultaneous = (n: number) =>
    Array.from({ length: n }, (_, i) => ev(`e${i}`, 9, 12));

  it('still shares equally while every event clears the floor', () => {
    // Two columns give 50% each, comfortably above the 40% floor.
    const out = byUid(layoutDay(simultaneous(2)));
    expect(out.get('e0')!.widthPct).toBe(50);
    expect(out.get('e1')!.widthPct).toBe(50);
    expect(out.get('e1')!.leftPct).toBe(50);
  });

  it('stops shrinking at the floor once a group is dense', () => {
    // Eight columns would be 12.5% each — unreadable. They hold at the floor
    // and overlap instead.
    const out = layoutDay(simultaneous(8));
    for (const p of out) expect(p.widthPct).toBe(MIN_EVENT_WIDTH_PCT);
  });

  it('spreads dense columns so the last one ends at the right edge', () => {
    const out = byUid(layoutDay(simultaneous(8)));
    expect(out.get('e0')!.leftPct).toBe(0);
    expect(out.get('e7')!.leftPct + MIN_EVENT_WIDTH_PCT).toBeCloseTo(100, 6);
  });

  it('offsets dense columns evenly', () => {
    const out = layoutDay(simultaneous(5)).sort((a, b) => a.leftPct - b.leftPct);
    const steps = out.slice(1).map((p, i) => p.leftPct - out[i].leftPct);
    for (const step of steps) expect(step).toBeCloseTo((100 - MIN_EVENT_WIDTH_PCT) / 4, 6);
  });

  it('switches to stacking exactly at the floor', () => {
    // Three columns are 33.3% — below 40 — so they stack.
    const three = layoutDay(simultaneous(3));
    for (const p of three) expect(p.widthPct).toBe(MIN_EVENT_WIDTH_PCT);
    // Two are 50% — above the floor — so they still share.
    const two = layoutDay(simultaneous(2));
    for (const p of two) expect(p.widthPct).toBe(50);
  });

  it('never emits a zero width, dense or not', () => {
    for (const n of [1, 2, 3, 8, 20]) {
      for (const p of layoutDay(simultaneous(n))) {
        expect(p.widthPct).toBeGreaterThan(0);
      }
    }
  });

  it('leaves an expanded event alone when its span clears the floor', () => {
    // a 9-10, b 9-10, d 9:30-10:30, c 10-11 — c expands over two of three
    // columns, so 66.7% clears the floor and the group is not dense for it.
    const out = byUid(
      layoutDay([ev('a', 9, 10), ev('b', 9, 10), evAt('d', 570, 630), ev('c', 10, 11)])
    );
    expect(out.get('c')!.widthPct).toBeCloseTo(100 * (2 / 3), 6);
    // …while the three that do not clear the floor still go dense, each on its
    // own account: one event clearing the floor must not speak for the group.
    for (const uid of ['a', 'b', 'd']) {
      expect(out.get(uid)!.widthPct).toBe(MIN_EVENT_WIDTH_PCT);
    }
  });
});
