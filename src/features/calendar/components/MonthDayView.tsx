import { memo, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  useWindowDimensions,
} from 'react-native';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'expo-router';
import { Repeat } from 'lucide-react-native';
import { useMonthGrid } from '@super-calendar/native';
import { useSettingsStore } from '@/stores/settingsStore';
import type { CalendarEvent } from '@/types';
import { AnimatedPressable } from '@/ui/components';
import { calendarLocale } from '../utils/calendar';

dayjs.extend(localizedFormat);

interface Props {
  date: Date;
  events: CalendarEvent[];
  weekStartsOn: 0 | 1;
  onSelectDate: (d: Date) => void;
  onPressEvent: (e: CalendarEvent) => void;
  onPressCell: (d: Date) => void;
}

function lastDayOf(e: CalendarEvent): dayjs.Dayjs {
  const start = dayjs(e.dtstart);
  const end = dayjs(e.dtend);
  if (e.allDay) return end.startOf('day');
  if (!end.isAfter(start)) return start.startOf('day');
  return end.subtract(1, 'millisecond').startOf('day');
}

export function eventDayKeys(e: CalendarEvent): string[] {
  const start = dayjs(e.dtstart);
  const startKey = start.format('YYYY-MM-DD');
  const endDay = lastDayOf(e);
  const keys: string[] = [];
  let cur = start.startOf('day');
  while (!cur.isAfter(endDay, 'day') && keys.length <= 366) {
    keys.push(cur.format('YYYY-MM-DD'));
    cur = cur.add(1, 'day');
  }
  return keys.length ? keys : [startKey];
}

export function eventCoversDay(e: CalendarEvent, dayKey: string): boolean {
  const startKey = dayjs(e.dtstart).format('YYYY-MM-DD');
  const endKey = lastDayOf(e).format('YYYY-MM-DD');
  return dayKey >= startKey && dayKey <= (endKey < startKey ? startKey : endKey);
}

function MonthDayViewImpl({ date, events, weekStartsOn, onSelectDate, onPressEvent, onPressCell }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const scaleCalendarText = useSettingsStore((s) => s.scaleCalendarText);
  const { height } = useWindowDimensions();

  const selected = useMemo(() => dayjs(date), [date]);
  const locale = useMemo(() => calendarLocale(language), [language]);

  const selectedDates = useMemo(() => [date], [date]);
  const { weeks, weekdays } = useMonthGrid(date, {
    weekStartsOn,
    selectedDates,
    locale,
    weekdayFormat: 'narrow',
  });

  const dotMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const add = (key: string, color: string) => {
      let set = map.get(key);
      if (!set) { set = new Set(); map.set(key, set); }
      set.add(color);
    };

    for (const ev of events) {
      for (const key of eventDayKeys(ev)) add(key, ev.color);
    }
    return map;
  }, [events]);

  const dayEvents = useMemo(() => {
    const sel = selected.format('YYYY-MM-DD');
    return events
      .filter((e) => eventCoversDay(e, sel))
      .sort((a, b) => a.dtstart.getTime() - b.dtstart.getTime());
  }, [events, selected]);

  const handleDayPress = useCallback((d: Date) => {
    onSelectDate(d);
  }, [onSelectDate]);

  const gridHeight = height * 0.44;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.grid, { height: gridHeight, borderBottomColor: theme.colors.border }]}>
        <View style={styles.dowRow}>
          {weekdays.map((d) => (
            <Text
              key={d.date.toISOString()}
              style={[styles.dowLabel, { color: theme.colors.textTertiary }]}
            >
              {d.label}
            </Text>
          ))}
        </View>

        {weeks.map((week) => (
          <View key={week.id} style={styles.weekRow}>
            {week.days.map((day) => {
              if (!day.isCurrentMonth) {
                return <View key={day.id} style={styles.dayCell} />;
              }
              const key = dayjs(day.date).format('YYYY-MM-DD');
              const dots = Array.from(dotMap.get(key) ?? []).slice(0, 3);

              return (
                <TouchableOpacity
                  key={day.id}
                  style={styles.dayCell}
                  onPress={() => handleDayPress(day.date)}
                  onLongPress={() => onPressCell(day.date)}
                >
                  <View style={[
                    styles.dayCircle,
                    { backgroundColor: day.isSelected ? theme.colors.primary : 'transparent' },
                    { borderWidth: day.isToday && !day.isSelected ? 1.5 : 0, borderColor: theme.colors.primary },
                  ]}>
                    <Text
                      numberOfLines={1}
                      allowFontScaling={scaleCalendarText}
                      style={[
                        styles.dayNumber,
                        { color: day.isSelected
                          ? theme.colors.primaryText
                          : day.isToday
                            ? theme.colors.primary
                            : theme.colors.text, fontWeight: day.isSelected || day.isToday ? '700' : '400' },
                      ]}>
                      {day.label}
                    </Text>
                  </View>
                  <View style={styles.dotsRow}>
                    {dots.map((color, ci) => (
                      <View key={ci} style={[styles.dot, { backgroundColor: color }]} />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.dayList}>
        <Text style={[styles.dayListHeader, { color: theme.colors.textSecondary }]}>
          {selected.locale(language).format('dddd, LL')}
        </Text>
        {dayEvents.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>{t('calendar.noEvents')}</Text>
        ) : (
          <FlatList
            data={dayEvents}
            keyExtractor={(e) => `${e.calendarId}-${e.uid}-${e.dtstart.getTime()}`}
            renderItem={({ item }) => (
              <AnimatedPressable
                style={[styles.eventRow, { borderLeftColor: item.color, backgroundColor: theme.colors.surface }]}
                onPress={() => onPressEvent(item)}
                scaleTo={0.98}
                opacityTo={0.7}
              >
                <View style={[styles.eventColorBar, { backgroundColor: item.color }]} />
                <View style={styles.eventInfo}>
                  <View style={styles.eventTitleRow}>
                    <Text style={[styles.eventTitle, { color: theme.colors.text }]} numberOfLines={1}>
                      {item.summary}
                    </Text>
                    {item.isRecurring && (
                      <Repeat
                        size={12}
                        color={theme.colors.textTertiary}
                        accessibilityLabel={t('event.recurring')}
                      />
                    )}
                  </View>
                  <Text style={[styles.eventTime, { color: theme.colors.textSecondary }]}>
                    {item.allDay
                      ? t('calendar.allDay')
                      : `${dayjs(item.dtstart).locale(language).format('LT')} – ${dayjs(item.dtend).locale(language).format('LT')}`}
                  </Text>
                </View>
              </AnimatedPressable>
            )}
            contentContainerStyle={{ paddingBottom: 16 }}
          />
        )}
      </View>
    </View>
  );
}

export const MonthDayView = memo(MonthDayViewImpl);

const styles = StyleSheet.create({
  container: { flex: 1 },
  grid: { borderBottomWidth: StyleSheet.hairlineWidth },
  dowRow: { flexDirection: 'row', paddingVertical: 6 },
  dowLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  weekRow: { flex: 1, flexDirection: 'row' },
  dayCell: { flex: 1, alignItems: 'center', paddingTop: 2 },
  dayCircle: { width: 28, height: 28, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  dayNumber: { fontSize: 14, textAlign: 'center' },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dayList: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  dayListHeader: { fontSize: 13, fontWeight: '600', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyText: { fontSize: 15, textAlign: 'center', marginTop: 32 },
  eventRow: { flexDirection: 'row', borderRadius: 8, marginBottom: 8, overflow: 'hidden' },
  eventColorBar: { width: 4 },
  eventInfo: { flex: 1, padding: 10 },
  eventTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eventTitle: { fontSize: 15, fontWeight: '500', flexShrink: 1 },
  eventTime: { fontSize: 12, marginTop: 2 },
});
