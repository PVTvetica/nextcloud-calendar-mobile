import { useEffect, useRef } from 'react';
import { useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useCalendarStore } from '@/stores/calendarStore';

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persistHourHeight(height: number): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const store = useCalendarStore.getState();
    if (height !== store.hourRowHeight) store.setHourRowHeight(height);
  }, 250);
}


export function useZoom() {
  const hourRowHeight = useCalendarStore((s) => s.hourRowHeight);
  const seedHourHeight = useRef(hourRowHeight).current;
  const cellHeight = useSharedValue(seedHourHeight);

  useEffect(() => {
    if (Math.round(cellHeight.value) !== hourRowHeight) cellHeight.value = hourRowHeight;
  }, [hourRowHeight, cellHeight]);

  useAnimatedReaction(
    () => Math.round(cellHeight.value),
    (next, previous) => {
      if (previous !== null && next !== previous) scheduleOnRN(persistHourHeight, next);
    },
  );

  return { hourRowHeight: seedHourHeight, cellHeight };
}
