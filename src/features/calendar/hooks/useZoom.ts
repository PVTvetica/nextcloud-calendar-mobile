import { useCallback, useEffect } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { useCalendarStore } from '@/stores/calendarStore';

/**
 * The grid's vertical scale: a live value during a pinch, a committed one for
 * everything else.
 *
 * `cellHeight` is the pixels-per-hour the grid actually draws from while the
 * gesture is in flight — one animated container height reads it, and every
 * child divides that height with flex or a percentage, so the whole grid
 * follows the fingers without an animated node per event.
 *
 * The pinch gesture itself lives in TimeGridView rather than here: an anchored
 * zoom has to move the scroll offset in the same frame it changes the height,
 * to keep the moment under the fingers under the fingers, and the ScrollView is
 * that component's to drive.
 *
 * The store stays the committed source of truth, and the two directions are
 * deliberately not symmetric: the effect below writes store → cellHeight only,
 * and the single write the other way is `commitZoom` when a gesture ends. An
 * effect pushing cellHeight back to the store would close the loop. That
 * one-way sync is also what keeps the settings screen's +/- and reset buttons
 * working untouched — they write to the store, and the grid follows.
 */
export function useZoom() {
  const hourRowHeight = useCalendarStore((s) => s.hourRowHeight);
  const setHourRowHeight = useCalendarStore((s) => s.setHourRowHeight);

  const cellHeight = useSharedValue(hourRowHeight);

  useEffect(() => {
    cellHeight.value = hourRowHeight;
  }, [hourRowHeight, cellHeight]);

  /**
   * Persist the zoom a gesture landed on. Rounded, so the value the effect
   * above hands back is identical to the one already held and the sync is a
   * no-op rather than a nudge.
   */
  const commitZoom = useCallback(
    (h: number) => { setHourRowHeight(Math.round(h)); },
    [setHourRowHeight]
  );

  return { hourRowHeight, cellHeight, commitZoom };
}
