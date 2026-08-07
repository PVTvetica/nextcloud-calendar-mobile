import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
// React Native's ScrollView, deliberately, not gesture-handler's: RNGH's is
// createNativeWrapper(RNScrollView, { disallowInterruption: true }), so wrapping
// it in our own GestureDetector puts two NativeViewGestureHandlers on one view
// and the inner one — which refuses interruption — never lets the scroll start.
// One native handler, ours, composed with the pager via simultaneousGestures.
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Gesture,
  GestureDetector,
  type ComposedGesture,
  type GestureType,
} from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { useTheme } from 'expo-router';
import InfinitePager, { type InfinitePagerImperativeApi } from 'react-native-infinite-pager';
import type { CalendarEvent } from '@/types';
import type { CalMode } from '../constants';
import {
  DAY_HEADER_HEIGHT,
  HOUR_RAIL_WIDTH,
  allDayRowHeight,
  buildDayIndex,
  pageDates,
  pageFocusDate,
} from '../utils/grid';
import type { GridEvent } from '../utils/toGridEvents';
import { HourRail } from './HourRail';
import { TimeGridHeader } from './TimeGridHeader';
import { TimeGridPage } from './TimeGridPage';

interface Props {
  mode: CalMode;
  anchorDate: Date;
  activeDate: Date;
  events: GridEvent[];
  allDayEvents: CalendarEvent[];
  hourRowHeight: number;
  weekStartsOn: 0 | 1;
  pinchGesture: ComposedGesture | GestureType;
  initialScrollHour: number;
  onPageChange: (focusDate: Date) => void;
  onPressSlot: (d: Date) => void;
  onPressEvent: (e: GridEvent) => void;
  onPressAllDayEvent: (e: CalendarEvent) => void;
}

function TimeGridViewImpl({
  mode, anchorDate, activeDate, events, allDayEvents, hourRowHeight, weekStartsOn,
  pinchGesture, initialScrollHour, onPageChange, onPressSlot, onPressEvent, onPressAllDayEvent,
}: Props) {
  const { colors } = useTheme();
  const pagerRef = useRef<InfinitePagerImperativeApi>(null);

  // One shared translate drives both pagers; the header derives its own index
  // from it (react-native-infinite-pager/src/index.tsx:250).
  const syncNode = useSharedValue(0);

  const nativeScroll = useMemo(() => Gesture.Native(), []);
  const simultaneous = useMemo(
    () => [nativeScroll, pinchGesture],
    [nativeScroll, pinchGesture]
  );

  const dayIndex = useMemo(() => buildDayIndex(events), [events]);
  const gridHeight = hourRowHeight * 24;

  // A single interval for the whole grid drives the now-indicator's position
  // *and* which column it's drawn on. Previously each DayColumn evaluated
  // `new Date()` at render time and, being memo'd on props that don't change
  // with the clock, never advanced once mounted.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // TimeGridHeader and DayColumn are memoised on the `dates` array reference;
  // pageDates(...) allocates a new array every call, so pages are cached by
  // index and invalidated only when the paging inputs themselves change.
  const datesForIndex = useMemo(() => {
    const cache = new Map<number, Date[]>();
    return (index: number) => {
      let dates = cache.get(index);
      if (!dates) {
        dates = pageDates(anchorDate, index, mode, weekStartsOn);
        cache.set(index, dates);
      }
      return dates;
    };
  }, [anchorDate, mode, weekStartsOn]);

  // Derived from activeDate rather than datesForIndex(0): datesForIndex(0) is
  // page 0 relative to anchorDate, which onPageChange deliberately leaves
  // untouched on swipe (see useCalendarNavigation). pageFocusDate guarantees
  // activeDate lands inside the page the user is actually looking at, and
  // pageDates' week alignment normalises it regardless of which day within
  // the page activeDate happens to be — exact for all three modes.
  // Sized on the tallest of the three buffered pages, not just the visible one.
  // activeDate only catches up once a swipe settles, so a header sized for the
  // outgoing page alone would be too short for the incoming page's chips for the
  // whole duration of the gesture — they would spill over the grid. Over-sizing
  // is invisible: the header is opaque and the grid flows under it.
  const headerHeight = useMemo(() => {
    let tallest = 0;
    for (const index of [-1, 0, 1]) {
      const band = allDayRowHeight(pageDates(activeDate, index, mode, weekStartsOn), allDayEvents);
      if (band > tallest) tallest = band;
    }
    return DAY_HEADER_HEIGHT + tallest;
  }, [activeDate, mode, weekStartsOn, allDayEvents]);

  // A new anchor (Today, a date picked elsewhere) or a new mode resets to page 0.
  useEffect(() => {
    pagerRef.current?.setPage(0, { animated: false });
  }, [anchorDate, mode]);

  const handlePageChange = useCallback(
    (index: number) => {
      onPageChange(pageFocusDate(anchorDate, index, mode, weekStartsOn));
    },
    [anchorDate, mode, weekStartsOn, onPageChange]
  );

  const renderHeaderPage = useCallback(
    ({ index }: { index: number }) => (
      <TimeGridHeader
        dates={datesForIndex(index)}
        activeDate={activeDate}
        allDayEvents={allDayEvents}
        onPressEvent={onPressAllDayEvent}
      />
    ),
    [datesForIndex, activeDate, allDayEvents, onPressAllDayEvent]
  );

  const renderGridPage = useCallback(
    ({ index }: { index: number }) => (
      <TimeGridPage
        dates={datesForIndex(index)}
        dayIndex={dayIndex}
        hourRowHeight={hourRowHeight}
        now={now}
        onPressSlot={onPressSlot}
        onPressEvent={onPressEvent}
      />
    ),
    [datesForIndex, dayIndex, hourRowHeight, now, onPressSlot, onPressEvent]
  );

  return (
    <GestureDetector gesture={pinchGesture}>
      <View style={styles.fill}>
        {/* The scroll fills the whole area and the opaque header floats over it.
            The content inset is the FIXED part of the header only (the day-number
            row); the variable all-day band overlays the top of the grid instead of
            displacing it. That is what Google Calendar does — swiping onto a week
            that has all-day events leaves every hour line at the same pixel, the
            header simply covers more of the grid. Insetting by the full header
            height instead would shove the content down by the band's height on
            every such swipe, which reads as the grid jumping back toward 00:00. */}
        <GestureDetector gesture={nativeScroll}>
          <ScrollView
            style={styles.fill}
            contentContainerStyle={styles.scrollContent}
            contentOffset={{ x: 0, y: initialScrollHour * hourRowHeight }}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.gridRow, { height: gridHeight }]}>
              <HourRail hourRowHeight={hourRowHeight} />
              <InfinitePager
                ref={pagerRef}
                style={styles.fill}
                pageWrapperStyle={styles.fill}
                height={gridHeight}
                renderPage={renderGridPage}
                syncNode={syncNode}
                onPageChange={handlePageChange}
                simultaneousGestures={simultaneous}
                pageBuffer={1}
              />
            </View>
          </ScrollView>
        </GestureDetector>

        <View
          testID="time-grid-header-row"
          style={[
            styles.headerRow,
            {
              height: headerHeight,
              borderBottomColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <View style={[styles.corner, { backgroundColor: colors.background }]} />
          <InfinitePager
            style={styles.fill}
            pageWrapperStyle={styles.fill}
            height={headerHeight}
            renderPage={renderHeaderPage}
            syncNode={syncNode}
            gesturesDisabled
            pageBuffer={1}
          />
        </View>
      </View>
    </GestureDetector>
  );
}

export const TimeGridView = memo(TimeGridViewImpl);

const styles = StyleSheet.create({
  fill: { flex: 1 },
  headerRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderBottomWidth: 2,
    zIndex: 20,
  },
  corner: { width: HOUR_RAIL_WIDTH, zIndex: 10 },
  gridRow: { flexDirection: 'row' },
  // Constant, deliberately: see the comment at the ScrollView.
  scrollContent: { paddingTop: DAY_HEADER_HEIGHT },
});
