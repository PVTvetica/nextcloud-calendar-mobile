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
  activeDate: Date;
  allDayEvents: CalendarEvent[];
  onPressEvent: (event: CalendarEvent) => void;
}

function TimeGridHeaderImpl({ dates, activeDate, allDayEvents, onPressEvent }: Props) {
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
        const isHighlight = dayjs(activeDate).isSame(date, 'date');
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
                {byDate[i].map((event) => (
                  <TouchableOpacity
                    key={event.uid}
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
