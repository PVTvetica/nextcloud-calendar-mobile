import type { PositionedEvent } from './eventLayout';
import type { GridEvent } from './toGridEvents';

export type DragMode = 'move' | 'resizeStart' | 'resizeEnd';

/** Fraction of a box's height, at each end, that resizes instead of moves. */
export const RESIZE_ZONE_RATIO = 0.2;

/**
 * Below this duration the 20% zones are too small to aim at reliably, so the
 * whole box moves instead. A 30-minute box would otherwise give two 6px targets.
 */
export const MIN_RESIZE_DURATION_MIN = 45;

const DAY_MINUTES = 1440;

/**
 * Which event a touch lands on, and what dragging from there should do.
 *
 * Reads the same PositionedEvent list the column renders, so the hit box is by
 * construction the drawn box — no second geometry calculation to drift.
 * Coordinates are relative to the day column: `x` from its left edge, `y` from
 * the top of the 24-hour grid.
 */
export function hitTestEvent(
  xInColumn: number,
  y: number,
  positioned: PositionedEvent[],
  columnWidth: number,
  gridHeight: number,
): { event: GridEvent; mode: DragMode } | null {
  // Topmost first: the box drawn last is the one the user sees and aims at.
  const candidates = [...positioned].sort((a, b) => b.zIndex - a.zIndex);

  for (const { event, leftPct, widthPct } of candidates) {
    const left = (leftPct / 100) * columnWidth;
    const right = left + (widthPct / 100) * columnWidth;
    if (xInColumn < left || xInColumn >= right) continue;

    const startMin = event.start.getHours() * 60 + event.start.getMinutes();
    const durationMin = (event.end.getTime() - event.start.getTime()) / 60_000;
    const top = (startMin / DAY_MINUTES) * gridHeight;
    const height = (durationMin / DAY_MINUTES) * gridHeight;
    if (y < top || y >= top + height) continue;

    if (durationMin < MIN_RESIZE_DURATION_MIN) return { event, mode: 'move' };

    const offset = y - top;
    if (offset < height * RESIZE_ZONE_RATIO) return { event, mode: 'resizeStart' };
    if (offset > height * (1 - RESIZE_ZONE_RATIO)) return { event, mode: 'resizeEnd' };
    return { event, mode: 'move' };
  }

  return null;
}
