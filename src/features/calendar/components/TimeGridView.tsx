import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Gesture,
  GestureDetector,
  ScrollView,
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

  const activeDates = useMemo(
    () => pageDates(anchorDate, 0, mode, weekStartsOn),
    [anchorDate, mode, weekStartsOn]
  );
  const headerHeight = DAY_HEADER_HEIGHT + allDayRowHeight(activeDates, allDayEvents);

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
        onPressSlot={onPressSlot}
        onPressEvent={onPressEvent}
      />
    ),
    [datesForIndex, dayIndex, hourRowHeight, onPressSlot, onPressEvent]
  );

  return (
    <GestureDetector gesture={pinchGesture}>
      <View style={styles.fill}>
        <View
          style={[
            styles.headerRow,
            { height: headerHeight, borderBottomColor: colors.border },
          ]}
        >
          <View style={styles.corner} />
          <InfinitePager
            style={styles.fill}
            pageWrapperStyle={styles.fill}
            renderPage={renderHeaderPage}
            syncNode={syncNode}
            gesturesDisabled
            pageBuffer={1}
          />
        </View>

        <GestureDetector gesture={nativeScroll}>
          <ScrollView
            style={styles.fill}
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
      </View>
    </GestureDetector>
  );
}

export const TimeGridView = memo(TimeGridViewImpl);

const styles = StyleSheet.create({
  fill: { flex: 1 },
  headerRow: { flexDirection: 'row', borderBottomWidth: 2 },
  corner: { width: HOUR_RAIL_WIDTH, zIndex: 10 },
  gridRow: { flexDirection: 'row' },
});
