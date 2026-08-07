import type { GridEvent } from './toGridEvents';

export interface PositionedEvent {
  event: GridEvent;
  /** Left edge as a percentage of the day column's width. */
  leftPct: number;
  /** Width as a percentage of the day column's width. Always > 0. */
  widthPct: number;
  zIndex: number;
}

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
    return {
      event,
      leftPct: (column / total) * 100,
      widthPct: (span / total) * 100,
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
