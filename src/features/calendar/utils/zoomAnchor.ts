/** Pixels per hour never goes below this: any tighter and an hour is unreadable. */
export const MIN_HOUR_ROW = 30;
/** Nor above this: beyond it a screen holds barely two hours. */
export const MAX_HOUR_ROW = 200;

/** The zoom the settings screen's reset button returns to. */
export const DEFAULT_HOUR_ROW = 60;

/**
 * The row height a pinch of `scale` reaches from the height it started at.
 *
 * Applied to the height captured when the gesture began rather than to the
 * running value: `scale` is already relative to the gesture's start, so
 * multiplying per frame would compound both the scale and its float error, and
 * the zoom would never settle on a clean level.
 */
export function scaledCellHeight(baseCellHeight: number, scale: number): number {
  'worklet';
  return Math.min(Math.max(baseCellHeight * scale, MIN_HOUR_ROW), MAX_HOUR_ROW);
}

/**
 * Where to scroll so the moment under the fingers stays under the fingers.
 *
 * Without this the grid is pinned at midnight and every hour line moves in
 * proportion to its distance from it — at 08:00, a change of 11 px per hour
 * swept the content 88 px under a stationary finger, which read as the grid
 * lurching rather than zooming.
 *
 * `focalY` is measured from the top of the scroll viewport, and the content
 * carries `headerInset` of padding above midnight, so the instant under the
 * focal point is `(scrollY + focalY - headerInset) / cellHeight` hours. Holding
 * that constant across the zoom and solving for the new offset gives the result
 * below. Negative offsets are clamped away; the far end is left to the
 * ScrollView, which knows its own content size.
 */
export function anchoredScrollY(args: {
  scrollY: number;
  focalY: number;
  headerInset: number;
  fromCellHeight: number;
  toCellHeight: number;
}): number {
  'worklet';
  const { scrollY, focalY, headerInset, fromCellHeight, toCellHeight } = args;
  // A zero height would make the ratio meaningless; leave the offset alone.
  if (fromCellHeight <= 0) return scrollY;
  const hoursAtFocal = (scrollY + focalY - headerInset) / fromCellHeight;
  return Math.max(0, hoursAtFocal * toCellHeight - focalY + headerInset);
}
