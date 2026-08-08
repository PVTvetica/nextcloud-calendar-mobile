import type { GridEvent } from './toGridEvents';

export interface PositionedEvent {
  event: GridEvent;
  /** Left edge as a percentage of the day column's width. */
  leftPct: number;
  /** Width as a percentage of the day column's width. Always > 0. */
  widthPct: number;
  zIndex: number;
}

/**
 * Below this width an event box is too narrow to read, so the layout stops
 * dividing and starts overlapping instead — Google Calendar's behaviour.
 *
 * At 40, one and two simultaneous events still share the column (100%, 50%);
 * three and more stack, because 33.3% is already under the floor. Lower it to
 * 33 to let three keep sharing and start stacking at four.
 */
export const MIN_EVENT_WIDTH_PCT = 40;

function overlaps(a: GridEvent, b: GridEvent): boolean {
  // Touching edges do not overlap: one ending exactly as the other begins is
  // two consecutive events, not a clash.
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime();
}

/**
 * Column assignment plus right-expansion, for one group of mutually chained
 * events.
 *
 * The expansion pass is what the old computeOverlapMap lacked: without it every
 * event in a group takes 1/N of the width, so a group chained together by a
 * long event turned every box into a sliver even when only two of them were
 * ever on screen at the same minute.
 *
 * The floor pass checks each event's expanded width independently: if an event
 * would be narrower than MIN_EVENT_WIDTH_PCT, it switches to dense stacking
 * instead. This allows events in the same chain to use different strategies:
 * an event that expands above the floor uses the regular formula, while a
 * narrower event in the same chain uses dense stacking, so nothing gets hidden.
 */
function layoutGroup(group: GridEvent[]): PositionedEvent[] {
  const columns: GridEvent[][] = [];
  const columnOf = new Map<GridEvent, number>();

  for (const event of group) {
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      const last = columns[c][columns[c].length - 1];
      if (last.end.getTime() <= event.start.getTime()) {
        columns[c].push(event);
        columnOf.set(event, c);
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([event]);
      columnOf.set(event, columns.length - 1);
    }
  }

  const total = columns.length;

  return group.map((event) => {
    const column = columnOf.get(event)!;
    let span = 1;
    for (let c = column + 1; c < total; c++) {
      if (columns[c].some((other) => overlaps(other, event))) break;
      span++;
    }

    const sharedWidth = (span / total) * 100;
    if (sharedWidth >= MIN_EVENT_WIDTH_PCT) {
      return {
        event,
        leftPct: (column / total) * 100,
        widthPct: sharedWidth,
        zIndex: 100 + column,
      };
    }

    // Dense: this event's expanded width is below the floor. Hold the floor and
    // slide each column right instead of dividing further. total > 1 here —
    // one column is 100% wide and two are 50%, both above the floor — so the
    // divisor is safe. The last column lands exactly at the right edge, and
    // zIndex keeps the later event on top.
    return {
      event,
      leftPct: column * ((100 - MIN_EVENT_WIDTH_PCT) / (total - 1)),
      widthPct: MIN_EVENT_WIDTH_PCT,
      zIndex: 100 + column,
    };
  });
}

/**
 * Lay out one day's slices side by side.
 *
 * Slices come from buildDayIndex and are already clamped to the day, so a
 * multi-day event cannot chain a group past midnight — the defect that made
 * every event in a busy week render about 1% wide.
 *
 * Ordering is stable: ties on start are broken by end, then by uid, so two
 * events starting in the same minute keep their columns across re-renders
 * instead of swapping and flickering sideways.
 */
export function layoutDay(slices: GridEvent[]): PositionedEvent[] {
  const sorted = [...slices].sort((a, b) => {
    const byStart = a.start.getTime() - b.start.getTime();
    if (byStart !== 0) return byStart;
    const byEnd = a.end.getTime() - b.end.getTime();
    if (byEnd !== 0) return byEnd;
    return a._event.uid.localeCompare(b._event.uid);
  });

  const out: PositionedEvent[] = [];
  let group: GridEvent[] = [];
  let groupEnd = -Infinity;

  for (const event of sorted) {
    if (group.length > 0 && event.start.getTime() >= groupEnd) {
      out.push(...layoutGroup(group));
      group = [];
      groupEnd = -Infinity;
    }
    group.push(event);
    groupEnd = Math.max(groupEnd, event.end.getTime());
  }
  if (group.length > 0) out.push(...layoutGroup(group));

  return out;
}
