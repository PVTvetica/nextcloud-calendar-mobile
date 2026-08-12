import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, type LayoutChangeEvent,
} from 'react-native';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { useTheme } from 'expo-router';
import InfinitePager, { type InfinitePagerImperativeApi } from 'react-native-infinite-pager';
import { useSettingsStore } from '@/stores/settingsStore';
import { contrastFor } from '@/features/calendar/utils/eventInk';
import type { CalendarEvent } from '@/types';

dayjs.extend(localizedFormat);

// Jumps within this many months slide (animated); farther ones re-anchor
// instantly rather than spring across a long stretch of empty months.
const MAX_ANIMATED_JUMP_MONTHS = 2;

// Cell geometry for fitting event chips under the day number. Before the first
// onLayout has measured the grid, FALLBACK_CHIP_SLOTS keeps chips rendering
// (also the path taken under jest, where onLayout never fires).
const DAY_NUMBER_BLOCK_HEIGHT = 34;
const CHIP_HEIGHT = 15;
const CHIP_GAP = 2;
const MIN_CHIP_SLOTS = 1;
const MAX_CHIP_SLOTS = 6;
const FALLBACK_CHIP_SLOTS = 3;

interface Props {
  date: Date;
  events: CalendarEvent[];
  weekStartsOn: 0 | 1;
  jump: { nonce: number; target: Date };
  onPressDay: (d: Date) => void;
  onMonthChange: (d: Date) => void;
  onPressCell: (d: Date) => void;
}

export function buildMonthGrid(year: number, month: number, weekStartsOn: 0 | 1): (dayjs.Dayjs | null)[][] {
  const firstOfMonth = dayjs(new Date(year, month, 1));

  const offset = (firstOfMonth.day() - weekStartsOn + 7) % 7;

  const rows: (dayjs.Dayjs | null)[][] = [];
  let cursor = firstOfMonth.subtract(offset, 'day');
  for (let row = 0; row < 6; row++) {
    const week: (dayjs.Dayjs | null)[] = [];
    for (let col = 0; col < 7; col++) {
      week.push(cursor.month() === month ? cursor : null);
      cursor = cursor.add(1, 'day');
    }
    const allNull = week.every((d) => d === null);
    if (allNull) break;
    rows.push(week);
    if (cursor.month() !== month && row >= 3) break;
  }
  return rows;
}

function lastDayOf(e: CalendarEvent): dayjs.Dayjs {
  const end = dayjs(e.dtend);
  if (e.allDay) return end.startOf('day');
  return (end.isSame(end.startOf('day')) ? end.subtract(1, 'millisecond') : end).startOf('day');
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

function monthDiff(from: Date, to: Date): number {
  return (dayjs(to).year() - dayjs(from).year()) * 12 + (dayjs(to).month() - dayjs(from).month());
}

interface MonthGridProps {
  weeks: (dayjs.Dayjs | null)[][];
  selected: dayjs.Dayjs;
  today: dayjs.Dayjs;
  eventsByDay: Map<string, CalendarEvent[]>;
  pageHeight: number;
  colors: ReturnType<typeof useTheme>['colors'];
  onLayout: (e: LayoutChangeEvent) => void;
  onDayPress: (d: dayjs.Dayjs) => void;
  onPressCell: (d: Date) => void;
}

// One month's grid, Google-style: every day cell lists its events as colored
// title chips, so the whole month is scannable at a glance. Rendered per pager
// page so a horizontal swipe slides a full month in and out under the finger.
const MonthGrid = memo(function MonthGrid({
  weeks, selected, today, eventsByDay, pageHeight, colors, onLayout, onDayPress, onPressCell,
}: MonthGridProps) {
  // How many chips fit under the day number in one cell of *this* month
  // (row count varies between 4 and 6 per month).
  const chipSlots = useMemo(() => {
    if (pageHeight <= 0 || weeks.length === 0) return FALLBACK_CHIP_SLOTS;
    const cellHeight = pageHeight / weeks.length;
    const free = cellHeight - DAY_NUMBER_BLOCK_HEIGHT + CHIP_GAP;
    const slots = Math.floor(free / (CHIP_HEIGHT + CHIP_GAP));
    return Math.max(MIN_CHIP_SLOTS, Math.min(MAX_CHIP_SLOTS, slots));
  }, [pageHeight, weeks.length]);

  return (
    <View style={styles.monthPage} onLayout={onLayout}>
      {weeks.map((week, wi) => (
        <View key={wi} style={[styles.weekRow, { borderTopColor: colors.border }]}>
          {week.map((d, di) => {
            if (d === null) {
              return <View key={di} style={styles.dayCell} />;
            }
            const key = d.format('YYYY-MM-DD');
            const isToday = d.isSame(today, 'day');
            const isSelected = d.isSame(selected, 'day');
            const dayEvents = eventsByDay.get(key) ?? [];
            // When not everything fits, the last slot is given to the "+N"
            // overflow marker instead of a chip.
            const visibleCount = dayEvents.length <= chipSlots ? dayEvents.length : chipSlots - 1;
            const chips = dayEvents.slice(0, visibleCount);
            const overflow = dayEvents.length - visibleCount;

            return (
              <TouchableOpacity
                key={di}
                style={styles.dayCell}
                onPress={() => onDayPress(d)}
                onLongPress={() => onPressCell(d.toDate())}
              >
                <View style={[
                  styles.dayCircle,
                  { backgroundColor: isSelected ? colors.primary : 'transparent' },
                  { borderWidth: isToday && !isSelected ? 1.5 : 0, borderColor: colors.primary },
                ]}>
                  <Text
                    numberOfLines={1}
                    allowFontScaling={false}
                    style={[
                      styles.dayNumber,
                      { color: isSelected
                        ? colors.primaryText
                        : isToday
                          ? colors.primary
                          : colors.text, fontWeight: isSelected || isToday ? '700' : '400' },
                    ]}>
                    {d.date()}
                  </Text>
                </View>
                <View style={styles.chipColumn}>
                  {chips.map((ev, ci) => (
                    <View
                      key={`${ev.calendarId}-${ev.uid}-${ci}`}
                      style={[styles.chip, { backgroundColor: ev.color }]}
                    >
                      <Text
                        numberOfLines={1}
                        allowFontScaling={false}
                        style={[styles.chipText, { color: contrastFor(ev.color).text }]}
                      >
                        {ev.summary}
                      </Text>
                    </View>
                  ))}
                  {overflow > 0 && (
                    <Text
                      numberOfLines={1}
                      allowFontScaling={false}
                      style={[styles.overflowText, { color: colors.textSecondary }]}
                    >
                      +{overflow}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
});

function MonthDayViewImpl({ date, events, weekStartsOn, jump, onPressDay, onMonthChange, onPressCell }: Props) {
  const theme = useTheme();
  const language = useSettingsStore((s) => s.language);

  const selected = useMemo(() => dayjs(date), [date]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      for (const key of eventDayKeys(ev)) {
        let list = map.get(key);
        if (!list) { list = []; map.set(key, list); }
        list.push(ev);
      }
    }
    // Google order: all-day (and multi-day) chips on top, timed events after,
    // each group chronologically.
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return a.dtstart.getTime() - b.dtstart.getTime();
      });
    }
    return map;
  }, [events]);

  const todayKey = dayjs().format('YYYY-MM-DD');
  const today = useMemo(() => dayjs(todayKey), [todayKey]);

  const handleDayPress = useCallback((d: dayjs.Dayjs) => {
    onPressDay(d.toDate());
  }, [onPressDay]);

  const dayHeaders = useMemo(() => {
    const headers: string[] = [];
    for (let i = 0; i < 7; i++) {
      const dow = (weekStartsOn + i) % 7;
      headers.push(dayjs().day(dow).locale(language).format('dd'));
    }
    return headers;
  }, [weekStartsOn, language]);

  // Measured height of a pager page; all pages share the same size. Drives how
  // many chips fit per cell. 0 until the first layout pass (fallback slots).
  const [pageHeight, setPageHeight] = useState(0);
  const handlePageLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setPageHeight((prev) => (Math.abs(prev - h) > 1 ? h : prev));
  }, []);

  // The pager pages by whole months: page `index` renders the month `index`
  // months from `localAnchor`. localAnchor is only reset on an external jump
  // (Today button, mode switch); ordinary swiping runs the index up and down
  // without re-anchoring, so paging never fights its own state.
  const [localAnchor, setLocalAnchor] = useState(date);
  const [pagerKey, setPagerKey] = useState(0);
  const pagerRef = useRef<InfinitePagerImperativeApi>(null);
  const localAnchorRef = useRef(localAnchor); localAnchorRef.current = localAnchor;
  const settledIndexRef = useRef(0);
  // Target index of an in-flight programmatic jump; while set, page-change
  // callbacks are the animation crossing months, not a user swipe, so they must
  // not report a month change (the parent already holds the jumped-to date).
  const jumpTargetRef = useRef<number | null>(null);

  // Re-anchor remounts the pager on a fresh key. A far jump's setPage would
  // write `translate` across a gap wider than the page buffer, leaving the
  // mounted pages several widths off-screen (blank) until curIndex caught up a
  // frame later. A remounted pager comes up at index 0 with translate 0,
  // consistent from its first commit. useLayoutEffect, not useEffect: the render
  // that carries the new anchor still sits on the old index, so it must not
  // paint — landing page 0 before paint removes the blank frame.
  const firstAnchorReset = useRef(true);
  useLayoutEffect(() => {
    if (firstAnchorReset.current) { firstAnchorReset.current = false; return; }
    settledIndexRef.current = 0;
    setPagerKey((k) => k + 1);
  }, [localAnchor]);

  const firstJump = useRef(true);
  useEffect(() => {
    if (firstJump.current) { firstJump.current = false; return; }
    const target = monthDiff(localAnchorRef.current, jump.target);
    const from = settledIndexRef.current;
    // Ignore jumps that land on the month already shown (e.g. tapping a day in
    // the current month).
    if (target === from) return;
    // Near jump (Today from a nearby month): slide to it like the other views.
    // At most MAX_ANIMATED_JUMP_MONTHS so the spring never crosses a page the
    // buffer has not mounted yet.
    if (Math.abs(target - from) <= MAX_ANIMATED_JUMP_MONTHS) {
      jumpTargetRef.current = target;
      settledIndexRef.current = target;
      pagerRef.current?.setPage(target, { animated: true });
      return;
    }
    // Too far to animate: re-anchor. The layout effect above remounts the pager
    // at index 0 on the new anchor, swapping months in a single commit rather
    // than blanking while the pager catches up.
    setLocalAnchor(jump.target);
  }, [jump]);

  const handlePageChange = useCallback((index: number) => {
    const prev = settledIndexRef.current;
    settledIndexRef.current = index;
    if (jumpTargetRef.current !== null) {
      if (index === jumpTargetRef.current) jumpTargetRef.current = null;
      return;
    }
    // InfinitePager emits the current page once on mount (and after a remount);
    // that echo is not a swipe. Only a real change of page reports a new month,
    // which also avoids a setState firing into the parent's render.
    if (index === prev) return;
    onMonthChange(dayjs(localAnchorRef.current).add(index, 'month').startOf('month').toDate());
  }, [onMonthChange]);

  const renderPage = useCallback(({ index }: { index: number }) => {
    const m = dayjs(localAnchor).add(index, 'month');
    const weeks = buildMonthGrid(m.year(), m.month(), weekStartsOn);
    return (
      <MonthGrid
        weeks={weeks}
        selected={selected}
        today={today}
        eventsByDay={eventsByDay}
        pageHeight={pageHeight}
        colors={theme.colors}
        onLayout={handlePageLayout}
        onDayPress={handleDayPress}
        onPressCell={onPressCell}
      />
    );
  }, [localAnchor, weekStartsOn, selected, today, eventsByDay, pageHeight, theme.colors, handlePageLayout, handleDayPress, onPressCell]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.dowRow}>
        {dayHeaders.map((d, i) => (
          <Text key={i} style={[styles.dowLabel, { color: theme.colors.textTertiary }]}>{d}</Text>
        ))}
      </View>

      <View style={styles.pagerWrap}>
        <InfinitePager
          key={pagerKey}
          ref={pagerRef}
          style={styles.fill}
          pageWrapperStyle={styles.fill}
          renderPage={renderPage}
          onPageChange={handlePageChange}
          pageBuffer={1}
        />
      </View>
    </View>
  );
}

export const MonthDayView = memo(MonthDayViewImpl);

const styles = StyleSheet.create({
  container: { flex: 1 },
  fill: { flex: 1 },
  dowRow: { flexDirection: 'row', paddingVertical: 6 },
  dowLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  pagerWrap: { flex: 1 },
  monthPage: { flex: 1 },
  weekRow: { flex: 1, flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  dayCell: { flex: 1, paddingTop: 2, overflow: 'hidden' },
  dayCircle: { width: 28, height: 28, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  dayNumber: { fontSize: 14, textAlign: 'center' },
  chipColumn: { alignSelf: 'stretch', paddingHorizontal: 2, gap: CHIP_GAP, marginTop: 2 },
  chip: { height: CHIP_HEIGHT, borderRadius: 4, paddingHorizontal: 4, justifyContent: 'center' },
  chipText: { fontSize: 10, fontWeight: '500' },
  overflowText: { fontSize: 10, fontWeight: '600', paddingHorizontal: 4 },
});
