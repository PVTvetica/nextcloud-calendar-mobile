import { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { dayKey } from '../utils/grid';
import type { GridEvent } from '../utils/toGridEvents';
import { layoutDay } from '../utils/eventLayout';
import { DayColumn } from './DayColumn';

const EMPTY: GridEvent[] = [];

interface Props {
  dates: Date[];
  dayIndex: Map<string, GridEvent[]>;
  hourRowHeight: number;
  now: Date;
  onPressSlot: (d: Date) => void;
  onPressEvent: (e: GridEvent) => void;
}

function TimeGridPageImpl({ dates, dayIndex, hourRowHeight, now, onPressSlot, onPressEvent }: Props) {
  // layoutDay runs per column per render; memoising it keeps a `now` tick from
  // recomputing every column when neither dates nor dayIndex actually changed.
  const layouts = useMemo(
    () => dates.map((d) => layoutDay(dayIndex.get(dayKey(d)) ?? EMPTY)),
    [dates, dayIndex]
  );

  return (
    <View style={styles.row}>
      {dates.map((date, i) => (
        <DayColumn
          key={dayKey(date)}
          date={date}
          positioned={layouts[i]}
          hourRowHeight={hourRowHeight}
          now={now}
          onPressSlot={onPressSlot}
          onPressEvent={onPressEvent}
        />
      ))}
    </View>
  );
}

export const TimeGridPage = memo(TimeGridPageImpl);

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
});
