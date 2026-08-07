import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
// React Native's ScrollView, deliberately, not gesture-handler's: RNGH's is
// createNativeWrapper(RNScrollView, { disallowInterruption: true }), so wrapping
// it in our own GestureDetector puts two NativeViewGestureHandlers on one view
// and the inner one — which refuses interruption — never lets the scroll start.
// One native handler, ours, composed with the pager via simultaneousGestures.
import {
  View,
  ScrollView,
  StyleSheet,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
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
  pageIndexForDate,
  stabilizeDayIndex,
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
  /** Bumped only by a date jump, never by a swipe. See useCalendarNavigation. */
  jump: { nonce: number; target: Date };
  pinchGesture: ComposedGesture | GestureType;
  initialScrollHour: number;
  onPageChange: (focusDate: Date) => void;
  onPressSlot: (d: Date) => void;
  onPressEvent: (e: GridEvent) => void;
  onPressAllDayEvent: (e: CalendarEvent) => void;
}

function TimeGridViewImpl({
  mode, anchorDate, activeDate, events, allDayEvents, hourRowHeight, weekStartsOn, jump,
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

  // buildDayIndex allocates a fresh array per day, so a sync touching one day
  // would otherwise hand every DayColumn a new `events` reference and re-render
  // the whole grid. Carrying over the previous array for unchanged days keeps
  // the re-render to the days that actually differ.
  const prevDayIndex = useRef<Map<string, GridEvent[]>>(new Map());
  const dayIndex = useMemo(() => {
    const next = stabilizeDayIndex(buildDayIndex(events), prevDayIndex.current);
    prevDayIndex.current = next;
    return next;
  }, [events]);
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

  // Which page the band is sized for. activeDate is deferred, so sizing off it
  // directly makes the band resize several frames after the swipe has landed —
  // very visible in day and 3days mode, where consecutive pages rarely share a
  // band height. handlePageChange knows the settled index immediately, so it
  // drives this; the effect below only re-syncs when the date changes from
  // outside (a jump, or mount).
  const activeIndex = useMemo(
    () => pageIndexForDate(anchorDate, activeDate, mode, weekStartsOn),
    [anchorDate, activeDate, mode, weekStartsOn]
  );
  const [settledIndex, setSettledIndex] = useState(activeIndex);
  useEffect(() => { setSettledIndex(activeIndex); }, [activeIndex]);

  const headerHeight = useMemo(
    () => DAY_HEADER_HEIGHT + allDayRowHeight(datesForIndex(settledIndex), allDayEvents),
    [datesForIndex, settledIndex, allDayEvents]
  );

  // The content is inset by the FULL header height so 00:00 sits just below the
  // band and stays reachable. On its own that would shove every hour line down
  // by the band's height whenever it appears — so the same frame scrolls by the
  // delta, cancelling the shift exactly. Net effect: hour lines never move, the
  // band just grows or shrinks, and the top of the day is never trapped under
  // the header.
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(initialScrollHour * hourRowHeight);
  const prevHeaderHeight = useRef(headerHeight);
  // useLayoutEffect, not useEffect: the padding change lands in the render
  // commit, so a passive effect corrects the scroll one frame later and that
  // frame shows the grid displaced by the band's height. Compensating before
  // paint keeps the two in the same frame.
  useLayoutEffect(() => {
    const delta = headerHeight - prevHeaderHeight.current;
    prevHeaderHeight.current = headerHeight;
    if (delta === 0) return;
    const y = Math.max(0, scrollY.current + delta);
    scrollY.current = y;
    scrollRef.current?.scrollTo({ y, animated: false });
  }, [headerHeight]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
  }, []);

  // The anchor only moves on a mode switch now, and the span changed with it,
  // so every cached page is invalid anyway: land on page 0 without animating.
  useEffect(() => {
    pagerRef.current?.setPage(0, { animated: false });
  }, [anchorDate, mode]);

  // A jump (Today, a date picked in the month view) animates to the target's
  // index instead of re-anchoring. The anchor stays put, so datesForIndex keeps
  // its cache and nothing rebuilds — the grid slides to the date.
  const jumpInputs = useRef({ anchorDate, mode, weekStartsOn });
  jumpInputs.current = { anchorDate, mode, weekStartsOn };
  const firstJump = useRef(true);
  useEffect(() => {
    // The initial value is the mount state, not a jump.
    if (firstJump.current) {
      firstJump.current = false;
      return;
    }
    const { anchorDate: a, mode: m, weekStartsOn: w } = jumpInputs.current;
    pagerRef.current?.setPage(pageIndexForDate(a, jump.target, m, w), { animated: true });
  }, [jump]);

  const handlePageChange = useCallback(
    (index: number) => {
      // Size the band from the settled page right away rather than waiting for
      // the deferred activeDate to come back around.
      setSettledIndex(index);
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
            ref={scrollRef}
            style={styles.fill}
            contentContainerStyle={{ paddingTop: headerHeight }}
            contentOffset={{ x: 0, y: initialScrollHour * hourRowHeight }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
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
    // Clips the incoming page's chips mid-swipe, while the row is still sized
    // for the outgoing page. The resize lands when the swipe does.
    overflow: 'hidden',
  },
  corner: { width: HOUR_RAIL_WIDTH, zIndex: 10 },
  gridRow: { flexDirection: 'row' },
});
