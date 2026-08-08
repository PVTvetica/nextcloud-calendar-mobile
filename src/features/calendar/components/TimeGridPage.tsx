import { memo, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { dayKey } from '../utils/grid';
import type { GridEvent } from '../utils/toGridEvents';
import { layoutDay, type PositionedEvent } from '../utils/eventLayout';
import { useEventDrag } from '../hooks/useEventDrag';
import { DayColumn } from './DayColumn';
import { DragGhost } from './DragGhost';

const EMPTY: GridEvent[] = [];

interface Props {
  dates: Date[];
  dayIndex: Map<string, GridEvent[]>;
  hourRowHeight: number;
  now: Date;
  onPressSlot: (d: Date) => void;
  onPressEvent: (e: GridEvent) => void;
  onMoveEvent?: (event: GridEvent, nextStart: Date, nextEnd: Date) => void;
}

function TimeGridPageImpl({
  dates,
  dayIndex,
  hourRowHeight,
  now,
  onPressSlot,
  onPressEvent,
  onMoveEvent,
}: Props) {
  // layoutDay runs per column per render. dayIndex itself is a fresh Map on
  // every rebuild (see grid.ts), so keying the memo on [dates, dayIndex] alone
  // still recomputes every column whenever anything in the whole page changed,
  // defeating stabilizeDayIndex's whole point of preserving unchanged days'
  // array identity. Caching layoutDay's result per slices-array instead means
  // a day whose array was reused by stabilizeDayIndex also reuses its
  // PositionedEvent[] here, so its DayColumn's memo can actually bail out. A
  // WeakMap keyed on the array lets entries die with it — no manual eviction.
  const layoutCache = useRef(new WeakMap<GridEvent[], PositionedEvent[]>());
  const layouts = useMemo(
    () =>
      dates.map((d) => {
        const slices = dayIndex.get(dayKey(d)) ?? EMPTY;
        const cached = layoutCache.current.get(slices);
        if (cached) return cached;
        const laid = layoutDay(slices);
        layoutCache.current.set(slices, laid);
        return laid;
      }),
    [dates, dayIndex]
  );

  // The gesture needs the target column from a raw x, which needs the page's
  // measured width — it is not known until the first layout pass.
  const [pageWidth, setPageWidth] = useState(0);
  const columnWidth = dates.length > 0 ? pageWidth / dates.length : 0;
  const handleLayout = (e: LayoutChangeEvent) => setPageWidth(e.nativeEvent.layout.width);

  const { gesture, drag, top, height, left } = useEventDrag({
    dates,
    layouts,
    hourRowHeight,
    columnWidth,
    onMoveEvent,
  });

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.row} onLayout={handleLayout}>
        {dates.map((date, i) => (
          <DayColumn
            key={dayKey(date)}
            date={date}
            positioned={layouts[i]}
            hourRowHeight={hourRowHeight}
            now={now}
            onPressSlot={onPressSlot}
            onPressEvent={onPressEvent}
            dimmedUid={drag?.event._event.uid}
          />
        ))}
        {drag && (
          <DragGhost
            event={drag.event}
            top={top}
            height={height}
            left={left}
            width={columnWidth}
          />
        )}
      </View>
    </GestureDetector>
  );
}

export const TimeGridPage = memo(TimeGridPageImpl);

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
});
