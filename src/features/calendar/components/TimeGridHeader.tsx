import { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from 'expo-router';
import dayjs from 'dayjs';
import { useSettingsStore } from '@/stores/settingsStore';
import type { CalendarEvent } from '@/types';
import {
  ALL_DAY_CHIP_GAP,
  ALL_DAY_CHIP_HEIGHT,
  allDayEventsForDay,
  allDayRowHeight,
  dayKey,
} from '../utils/grid';

interface Props {
  dates: Date[];
  /**
   * Ticks once a minute from TimeGridView. Only today gets the pill, and
   * reading the clock at render inside a memo'd component would strand the
   * highlight on yesterday past midnight — same trap as the now-indicator.
   */
  now: Date;
  allDayEvents: CalendarEvent[];
  onPressEvent: (event: CalendarEvent) => void;
}

function TimeGridHeaderImpl({ dates, now, allDayEvents, onPressEvent }: Props) {
  const theme = useTheme();
  const language = useSettingsStore((s) => s.language);

  const { sectionHeight, byDate } = useMemo(
    () => ({
      sectionHeight: allDayRowHeight(dates, allDayEvents),
      byDate: dates.map((d) => allDayEventsForDay(d, allDayEvents)),
    }),
    [dates, allDayEvents]
  );

  return (
    <View style={{ flexDirection: 'row', flex: 1 }}>
      {dates.map((date, i) => {
        const isHighlight = dayjs(now).isSame(date, 'day');
        return (
          <View key={dayKey(date)} style={{ flex: 1, paddingTop: 8 }}>
            <View style={{ height: 56, justifyContent: 'space-between' }}>
              <Text
                style={{
                  textAlign: 'center', fontSize: 13, fontWeight: '600', textTransform: 'capitalize',
                  color: isHighlight ? theme.colors.primary : theme.colors.textSecondary,
                }}
              >
                {dayjs(date).locale(language).format('ddd')}
              </Text>
              <View
                testID={isHighlight ? `day-highlight-${dayKey(date)}` : undefined}
                style={[
                  { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
                  isHighlight && {
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: theme.colors.primary, marginBottom: 0,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  allowFontScaling={false}
                  style={{ fontSize: 20, textAlign: 'center', color: isHighlight ? '#fff' : theme.colors.text }}
                >
                  {dayjs(date).format('D')}
                </Text>
              </View>
            </View>

            {byDate[i].length > 0 && (
              <View style={{ borderLeftWidth: 1, borderLeftColor: theme.colors.border, height: sectionHeight }}>
                {byDate[i].map((event, chipIndex) => (
                  <TouchableOpacity
                    // uid is indexed but not unique (schema.ts): recurrence
                    // instances share a UID by iCalendar design, so two
                    // occurrences landing on the same day collide on a bare
                    // uid key. DayColumn already keys on uid + start; the index
                    // closes the remaining case of a true duplicate row.
                    key={`${event.uid}-${event.dtstart.getTime()}-${chipIndex}`}
                    // Explicit height and gap rather than letting text metrics
                    // decide: allDayRowHeight reserves exactly this much per
                    // chip, so any drift here reopens the gap under the band.
                    style={{
                      backgroundColor: event.color,
                      borderRadius: 2,
                      paddingHorizontal: 4,
                      height: ALL_DAY_CHIP_HEIGHT,
                      justifyContent: 'center',
                      marginTop: ALL_DAY_CHIP_GAP,
                      marginHorizontal: 2,
                    }}
                    onPress={() => onPressEvent(event)}
                  >
                    <Text
                      style={{ fontSize: 12, lineHeight: 14, color: '#fff' }}
                      numberOfLines={1}
                      allowFontScaling={false}
                    >
                      {event.summary}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

export const TimeGridHeader = memo(TimeGridHeaderImpl);
