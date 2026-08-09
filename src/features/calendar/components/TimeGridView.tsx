import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
// Reanimated's ScrollView wraps React Native's, deliberately, not
// gesture-handler's: RNGH's is createNativeWrapper(RNScrollView,
// { disallowInterruption: true }), so wrapping it in our own GestureDetector
// puts two NativeViewGestureHandlers on one view and the inner one — which
// refuses interruption — never lets the scroll start. One native handler,
// ours, composed with the pager via simultaneousGestures. The Reanimated
// wrapper is what lets the pinch worklet scroll it in its own frame.
import Animated, {
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { anchoredScrollY, scaledCellHeight } from '../utils/zoomAnchor';
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
import { GridLines } from './GridLines';
import { HourRail } from './HourRail';
import { TimeGridHeader } from './TimeGridHeader';
import { TimeGridPage } from './TimeGridPage';

/**
 * Beyond this many pages, a jump re-anchors instead of animating. The pager
 * only mounts pageBuffer pages either side of the current index, so sliding
 * further than that crosses unmounted space.
 */
const MAX_ANIMATED_JUMP_PAGES = 2;

interface Props {
  mode: CalMode;
  anchorDate: Date;
  activeDate: Date;
  events: GridEvent[];
  allDayEvents: CalendarEvent[];
  hourRowHeight: number;
  /** Live pixels-per-hour during a pinch; the grid container animates from it. */
  cellHeight: SharedValue<number>;
  weekStartsOn: 0 | 1;
  /** Bumped only by a date jump, never by a swipe. See useCalendarNavigation. */
  jump: { nonce: number; target: Date };
  /** Persist the zoom a pinch landed on. Called once, when the gesture ends. */
  commitZoom: (h: number) => void;
  initialScrollHour: number;
  onPageChange: (focusDate: Date) => void;
  onPressSlot: (d: Date) => void;
  onPressEvent: (e: GridEvent) => void;
  onPressAllDayEvent: (e: CalendarEvent) => void;
  onMoveEvent?: (event: GridEvent, nextStart: Date, nextEnd: Date) => void;
}

function TimeGridViewImpl({
  mode, anchorDate, activeDate, events, allDayEvents, hourRowHeight, cellHeight, weekStartsOn,
  jump, commitZoom, initialScrollHour, onPageChange, onPressSlot, onPressEvent,
  onPressAllDayEvent, onMoveEvent,
}: Props) {
  const { colors } = useTheme();
  const pagerRef = useRef<InfinitePagerImperativeApi>(null);

  // One shared translate drives both pagers; the header derives its own index
  // from it (react-native-infinite-pager/src/index.tsx:250).
  const syncNode = useSharedValue(0);

  const nativeScroll = useMemo(() => Gesture.Native(), []);

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

  // The grid's single animated node. Every child divides this height — the rail
  // and hour cells with flex, event boxes and the now indicator with
  // percentages of the 24-hour span — so a pinch moves the whole grid at 60 fps
  // without an animated node per event. A real height, not a transform:
  // animating the layout prop keeps the ScrollView's content size in sync,
  // where a composited transform would leave the scroll range stale.
  const gridHeightStyle = useAnimatedStyle(() => ({ height: cellHeight.value * 24 }), [cellHeight]);

  // A single interval for the whole grid drives the now-indicator's position
  // *and* which column it's drawn on. Previously each DayColumn evaluated
  // `new Date()` at render time and, being memo'd on props that don't change
  // with the clock, never advanced once mounted.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // The grid keeps its own anchor. It starts from the prop and follows it on a
  // mode switch, but a long jump re-anchors locally (see the jump effect): the
  // pager cannot animate across an arbitrary index gap, and re-anchoring is how
  // a distant date becomes page 0 again.
  const [localAnchor, setLocalAnchor] = useState(anchorDate);
  useEffect(() => { setLocalAnchor(anchorDate); }, [anchorDate]);

  // TimeGridHeader and DayColumn are memoised on the `dates` array reference;
  // pageDates(...) allocates a new array every call, so pages are cached by
  // index and invalidated only when the paging inputs themselves change.
  const datesForIndex = useMemo(() => {
    const cache = new Map<number, Date[]>();
    return (index: number) => {
      let dates = cache.get(index);
      if (!dates) {
        dates = pageDates(localAnchor, index, mode, weekStartsOn);
        cache.set(index, dates);
      }
      return dates;
    };
  }, [localAnchor, mode, weekStartsOn]);

  // Which page the band is sized for. activeDate is deferred, so sizing off it
  // directly makes the band resize several frames after the swipe has landed —
  // very visible in day and 3days mode, where consecutive pages rarely share a
  // band height. handlePageChange knows the settled index immediately, so it
  // drives this; the effect below only re-syncs when the date changes from
  // outside (a jump, or mount).
  const activeIndex = useMemo(
    () => pageIndexForDate(localAnchor, activeDate, mode, weekStartsOn),
    [localAnchor, activeDate, mode, weekStartsOn]
  );
  const [settledIndex, setSettledIndex] = useState(activeIndex);
  useEffect(() => { setSettledIndex(activeIndex); }, [activeIndex]);
  // The jump effect needs the current index without re-running when it moves.
  const settledIndexRef = useRef(settledIndex);
  settledIndexRef.current = settledIndex;

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
  // An animated ref, so the pinch worklet can scroll in the same frame it
  // changes the height. A shared value mirrors the offset for the same reason:
  // the anchor maths run on the UI thread and cannot read a JS ref.
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(initialScrollHour * hourRowHeight);
  const prevHeaderHeight = useRef(headerHeight);
  const scrollHandler = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  // useLayoutEffect, not useEffect: the padding change lands in the render
  // commit, so a passive effect corrects the scroll one frame later and that
  // frame shows the grid displaced by the band's height. Compensating before
  // paint keeps the two in the same frame.
  useLayoutEffect(() => {
    const delta = headerHeight - prevHeaderHeight.current;
    prevHeaderHeight.current = headerHeight;
    if (delta === 0) return;
    const y = Math.max(0, scrollY.value + delta);
    scrollY.value = y;
    scrollRef.current?.scrollTo({ y, animated: false });
  }, [headerHeight, scrollY, scrollRef]);

  // The zoom, anchored to the fingers.
  //
  // Changing the height alone pins the grid at midnight, so every hour line
  // moves in proportion to its distance from it: measured on device, 51 -> 62
  // px/hour swept the 08:00 line 88px under a stationary finger. Scrolling in
  // the same frame keeps the instant under the focal point where it was, which
  // is what makes the gesture read as a zoom rather than a lurch.
  // Frozen at mount. As a live expression this would recompute from the
  // committed hourRowHeight after every pinch, and a changed contentOffset prop
  // is re-applied by the ScrollView — teleporting the view back to the seed
  // hour at the end of each gesture.
  const initialOffset = useRef({ x: 0, y: initialScrollHour * hourRowHeight }).current;

  const pinchBase = useSharedValue(hourRowHeight);
  const pinchStartScrollY = useSharedValue(0);
  const headerInset = useSharedValue(headerHeight);
  useEffect(() => { headerInset.value = headerHeight; }, [headerHeight, headerInset]);

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onStart(() => {
          // Both captured at the start, for the same reason: `scale` is
          // relative to the gesture's beginning, so the offset it implies must
          // be measured from there too. Accumulating either per frame
          // compounds float error and the zoom never settles.
          pinchBase.value = cellHeight.value;
          pinchStartScrollY.value = scrollY.value;
        })
        .onUpdate((e) => {
          const next = scaledCellHeight(pinchBase.value, e.scale);
          const y = anchoredScrollY({
            scrollY: pinchStartScrollY.value,
            focalY: e.focalY,
            headerInset: headerInset.value,
            fromCellHeight: pinchBase.value,
            toCellHeight: next,
          });
          // Not rounded: the live value is continuous so the grid tracks the
          // fingers smoothly. onEnd rounds the one value that is kept.
          cellHeight.value = next;
          scrollY.value = y;
          scrollTo(scrollRef, 0, y, false);
        })
        .onEnd(() => {
          scheduleOnRN(commitZoom, cellHeight.value);
        }),
    [commitZoom, cellHeight, pinchBase, pinchStartScrollY, headerInset, scrollY, scrollRef]
  );

  // Handed to the pager so a pinch and a page swipe do not fight each other.
  const simultaneous = useMemo(
    () => [nativeScroll, pinchGesture],
    [nativeScroll, pinchGesture]
  );

  // The anchor only moves on a mode switch now, and the span changed with it,
  // so every cached page is invalid anyway: land on page 0 without animating.
  /**
   * Remount key for both pagers, bumped on every re-anchor.
   *
   * setPage writes `translate` immediately while the pager's own curIndex only
   * catches up through an animated reaction and a React state update. Across a
   * large gap that leaves the mounted pages positioned several widths
   * off-screen for as long as the re-render takes — a second and a half with a
   * heavy month, showing first the wrong week and then nothing at all.
   *
   * Remounting sidesteps the desync: a fresh pager starts at index 0 with
   * translate 0, consistent from its first commit. React also builds the new
   * subtree before committing it, so the previous week stays on screen until
   * the new one is ready to replace it, rather than blanking while it works.
   */
  const [pagerKey, setPagerKey] = useState(0);
  const firstAnchorReset = useRef(true);
  // useLayoutEffect, not useEffect: re-anchoring rebuilds datesForIndex while
  // the pager is still sitting on the old index, so the render that carries the
  // new anchor paints "old index, new anchor" — a page weeks away from the
  // target, and empty. Landing on page 0 before paint removes that frame.
  useLayoutEffect(() => {
    // Skip the mount run: the pager is already at 0, and settledIndex is
    // already seeded from activeDate. Resetting here would size the header for
    // the anchor page rather than the page actually on screen.
    if (firstAnchorReset.current) {
      firstAnchorReset.current = false;
      return;
    }
    // The pagers remount on this key, so they come up at index 0 on their own.
    // Only the shared translate has to be cleared, or the fresh pagers would
    // read the departed page's offset.
    syncNode.value = 0;
    setSettledIndex(0);
    setPagerKey((k) => k + 1);
    // syncNode is deliberately not a dependency: it is a mutable container, not
    // a value, and the project's Reanimated test mock hands back a fresh object
    // on every render — listing it would re-run this effect every render and
    // bump the key forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localAnchor, mode]);

  /**
   * A jump: Today, or a date picked in the month view.
   *
   * Near targets slide. Far ones re-anchor and land, because the pager cannot
   * cross an arbitrary gap: only pageBuffer pages around the current index are
   * mounted, and driving `translate` across dozens of indices leaves the
   * mounted pages positioned off-screen — the blank grid. Re-anchoring makes
   * the target page 0 again and the reset effect above lands on it directly.
   * Nothing is lost visually: a slide across fifty weeks is not readable
   * anyway.
   */
  const jumpInputs = useRef({ localAnchor, mode, weekStartsOn });
  jumpInputs.current = { localAnchor, mode, weekStartsOn };
  const firstJump = useRef(true);
  useEffect(() => {
    // The initial value is the mount state, not a jump.
    if (firstJump.current) {
      firstJump.current = false;
      return;
    }
    const { localAnchor: a, mode: m, weekStartsOn: w } = jumpInputs.current;
    const target = pageIndexForDate(a, jump.target, m, w);
    const from = settledIndexRef.current;
    if (target === from) return;

    if (Math.abs(target - from) <= MAX_ANIMATED_JUMP_PAGES) {
      setSettledIndex(target);
      pagerRef.current?.setPage(target, { animated: true });
      return;
    }
    // Too far to animate: re-anchor. The layout effect above remounts the
    // pagers at index 0 on the new anchor, swapping the old week for the new
    // one in a single commit instead of blanking while the pager catches up.
    setLocalAnchor(jump.target);
  }, [jump]);

  const handlePageChange = useCallback(
    (index: number) => {
      // Size the band from the settled page right away rather than waiting for
      // the deferred activeDate to come back around.
      setSettledIndex(index);
      onPageChange(pageFocusDate(localAnchor, index, mode, weekStartsOn));
    },
    [localAnchor, mode, weekStartsOn, onPageChange]
  );

  const renderHeaderPage = useCallback(
    ({ index }: { index: number }) => (
      <TimeGridHeader
        dates={datesForIndex(index)}
        now={now}
        allDayEvents={allDayEvents}
        onPressEvent={onPressAllDayEvent}
      />
    ),
    [datesForIndex, now, allDayEvents, onPressAllDayEvent]
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
        onMoveEvent={onMoveEvent}
      />
    ),
    [datesForIndex, dayIndex, hourRowHeight, now, onPressSlot, onPressEvent, onMoveEvent]
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
          <Animated.ScrollView
            ref={scrollRef}
            style={styles.fill}
            contentContainerStyle={{ paddingTop: headerHeight }}
            contentOffset={initialOffset}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.gridRow, gridHeightStyle]}>
              {/* Behind the rail and the pager: one set of horizontal rules for
                  the whole grid rather than 24 flex cells per day column. The
                  opaque rail covers the part that runs behind it. */}
              <GridLines />
              <HourRail />
              <InfinitePager
                key={pagerKey}
                ref={pagerRef}
                style={styles.fill}
                pageWrapperStyle={styles.fill}
                renderPage={renderGridPage}
                syncNode={syncNode}
                onPageChange={handlePageChange}
                simultaneousGestures={simultaneous}
                pageBuffer={1}
              />
            </Animated.View>
          </Animated.ScrollView>
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
            key={pagerKey}
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
