import { memo, useCallback } from 'react';
import { View, Pressable, StyleSheet, type GestureResponderEvent } from 'react-native';
import { useTheme } from 'expo-router';
import dayjs from 'dayjs';
import { eventPositionStyle, nowTopPct } from '../utils/grid';
import type { GridEvent } from '../utils/toGridEvents';
import { TimeGridEvent } from './TimeGridEvent';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface Props {
  date: Date;
  events: GridEvent[];
  hourRowHeight: number;
  onPressSlot: (d: Date) => void;
  onPressEvent: (e: GridEvent) => void;
}

function DayColumnImpl({ date, events, hourRowHeight, onPressSlot, onPressEvent }: Props) {
  const { colors } = useTheme();
  const isToday = dayjs().isSame(date, 'day');

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      const raw = Math.floor(e.nativeEvent.locationY / hourRowHeight);
      const hour = Math.min(23, Math.max(0, raw));
      onPressSlot(dayjs(date).hour(hour).minute(0).second(0).millisecond(0).toDate());
    },
    [date, hourRowHeight, onPressSlot]
  );

  return (
    <View style={styles.column}>
      {HOURS.map((hour) => (
        <View
          key={hour}
          testID={`hour-cell-${hour}`}
          style={{
            borderLeftWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.border,
            height: hourRowHeight,
            justifyContent: 'space-evenly',
          }}
        >
          <View style={{ borderLeftWidth: 1, borderBottomWidth: 1, borderColor: colors.borderSubtle, height: 1 }} />
        </View>
      ))}

      <Pressable testID="day-column-surface" style={StyleSheet.absoluteFill} onPress={handlePress} />

      {events.map((event) => {
        const { top, height } = eventPositionStyle(event.start, event.end);
        return (
          <TimeGridEvent
            key={`${event._event.uid}-${event.start.getTime()}`}
            event={event}
            top={top}
            height={height}
            hourRowHeight={hourRowHeight}
            onPress={onPressEvent}
          />
        );
      })}

      {isToday && (
        <View
          testID="now-indicator"
          pointerEvents="none"
          style={[styles.nowIndicator, { top: `${nowTopPct(new Date())}%` }]}
        />
      )}
    </View>
  );
}

export const DayColumn = memo(DayColumnImpl);

const styles = StyleSheet.create({
  column: { flex: 1, overflow: 'hidden' },
  nowIndicator: {
    position: 'absolute',
    zIndex: 10000,
    height: 2,
    width: '100%',
    backgroundColor: 'red',
  },
});
