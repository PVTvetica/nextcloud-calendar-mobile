import { useCallback, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useCalendarStore } from '@/stores/calendarStore';

const MIN_HOUR_ROW = 30;
const MAX_HOUR_ROW = 200;

export function useZoom() {
  const hourRowHeight = useCalendarStore((s) => s.hourRowHeight);
  const setHourRowHeight = useCalendarStore((s) => s.setHourRowHeight);

  const pendingHeight = useSharedValue(hourRowHeight);
  const pinchBase = useSharedValue(hourRowHeight);

  const commitZoom = useCallback((h: number) => { setHourRowHeight(h); }, [setHourRowHeight]);

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onStart(() => { pinchBase.value = hourRowHeight; })
        .onUpdate((e) => {
          pendingHeight.value = Math.min(Math.max(Math.round(pinchBase.value * e.scale), MIN_HOUR_ROW), MAX_HOUR_ROW);
        })
        .onEnd(() => { scheduleOnRN(commitZoom, pendingHeight.value); }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commitZoom]
  );

  return { hourRowHeight, pinchGesture };
}
