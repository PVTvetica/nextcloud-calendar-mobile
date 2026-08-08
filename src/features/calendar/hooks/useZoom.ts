import { useCallback, useEffect, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useCalendarStore } from '@/stores/calendarStore';

const MIN_HOUR_ROW = 30;
const MAX_HOUR_ROW = 200;

/**
 * The grid's vertical scale, live during a pinch and committed on release.
 *
 * `cellHeight` is the pixels-per-hour the grid actually draws from while the
 * gesture is in flight — one animated container height reads it, and every
 * child divides that height with flex or a percentage, so the whole grid
 * follows the fingers without an animated node per event.
 *
 * The store stays the committed source of truth, and the two directions are
 * deliberately not symmetric: the effect below writes store → cellHeight only,
 * and the single write the other way is onEnd's commit. An effect pushing
 * cellHeight back to the store would close the loop. That one-way sync is also
 * what keeps the settings screen's +/- and reset buttons working untouched —
 * they write to the store, and the grid follows.
 */
export function useZoom() {
  const hourRowHeight = useCalendarStore((s) => s.hourRowHeight);
  const setHourRowHeight = useCalendarStore((s) => s.setHourRowHeight);

  const cellHeight = useSharedValue(hourRowHeight);
  /**
   * The height when the pinch began. `event.scale` is relative to that start,
   * so applying it to a captured base keeps the zoom exact; multiplying
   * per-frame deltas compounds float error and never settles on a clean level.
   */
  const pinchBase = useSharedValue(hourRowHeight);

  useEffect(() => {
    cellHeight.value = hourRowHeight;
  }, [hourRowHeight, cellHeight]);

  const commitZoom = useCallback(
    (h: number) => { setHourRowHeight(h); },
    [setHourRowHeight]
  );

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onStart(() => {
          pinchBase.value = cellHeight.value;
        })
        .onUpdate((e) => {
          // Not rounded here: the live value is continuous so the grid tracks
          // the fingers smoothly. onEnd rounds the one value that is kept.
          cellHeight.value = Math.min(
            Math.max(pinchBase.value * e.scale, MIN_HOUR_ROW),
            MAX_HOUR_ROW
          );
        })
        .onEnd(() => {
          scheduleOnRN(commitZoom, Math.round(cellHeight.value));
        }),
    [commitZoom, cellHeight, pinchBase]
  );

  return { hourRowHeight, cellHeight, pinchGesture };
}
