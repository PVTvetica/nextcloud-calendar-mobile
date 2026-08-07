import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { dayKey } from '../utils/grid';
import type { GridEvent } from '../utils/toGridEvents';
import { DayColumn } from './DayColumn';

const EMPTY: GridEvent[] = [];

interface Props {
  dates: Date[];
  dayIndex: Map<string, GridEvent[]>;
  hourRowHeight: number;
  onPressSlot: (d: Date) => void;
  onPressEvent: (e: GridEvent) => void;
}

function TimeGridPageImpl({ dates, dayIndex, hourRowHeight, onPressSlot, onPressEvent }: Props) {
  return (
    <View style={styles.row}>
      {dates.map((date) => (
        <DayColumn
          key={dayKey(date)}
          date={date}
          events={dayIndex.get(dayKey(date)) ?? EMPTY}
          hourRowHeight={hourRowHeight}
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
