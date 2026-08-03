import { useCallback, useEffect } from 'react';
import { useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useCalendarStore } from '@/stores/calendarStore';
export function useZoom() {
  const hourRowHeight = useCalendarStore((s) => s.hourRowHeight);
  const setHourRowHeight = useCalendarStore((s) => s.setHourRowHeight);

  const cellHeight = useSharedValue(hourRowHeight);

  useEffect(() => {
    if (cellHeight.value !== hourRowHeight) cellHeight.value = hourRowHeight;
  }, [hourRowHeight, cellHeight]);

  const persist = useCallback((h: number) => {
    const rounded = Math.round(h);
    if (rounded !== useCalendarStore.getState().hourRowHeight) setHourRowHeight(rounded);
  }, [setHourRowHeight]);

  useAnimatedReaction(
    () => cellHeight.value,
    (next, previous) => {
      if (previous !== null && Math.round(next) !== Math.round(previous)) {
        scheduleOnRN(persist, next);
      }
    },
    [persist],
  );

  return { hourRowHeight, cellHeight };
}
