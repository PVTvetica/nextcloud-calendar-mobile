import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { styles } from '@/styles/calendarScreen';
import { useAppStore } from '@/store/appStore';
import { useTheme } from '@/hooks/useTheme';
import { CalendarDrawer } from '@/components/CalendarDrawer';
import { OfflineBanner } from '@/components/OfflineBanner';
import { MonthDayView } from '@/components/MonthDayView';
import { AgendaView } from '@/components/AgendaView';
import { computeOverlapMap } from '@/utils/overlapMap';
import { createNavigationGuard } from '@/utils/navigationGuard';
import type { CalendarEvent } from '@/types';
import { useCalendarNavigation } from './hooks/useCalendarNavigation';
import { useCalendarData } from './hooks/useCalendarData';
import { useCalendarLayout } from './hooks/useCalendarLayout';
import { useCalendarDrawer } from './hooks/useCalendarDrawer';
import { useZoom } from './hooks/useZoom';
import { CalendarTopBar } from './components/CalendarTopBar';
import { TimeGridView } from './components/TimeGridView';
import { TimeGridEvent } from './components/TimeGridEvent';
import { toBigCalendarEvents } from './utils/toCalendarEvents';
import { isCalMode } from './constants';

dayjs.extend(isoWeek);

export default function CalendarScreen() {
  const router = useRouter();
  const theme = useTheme();

  const weekStartsOn = useAppStore((s) => s.weekStartsOn);
  const hiddenCalendarIds = useAppStore((s) => s.hiddenCalendarIds);
  const toggleCalendarVisibility = useAppStore((s) => s.toggleCalendarVisibility);

  const nav = useCalendarNavigation();
  const { viewMode, date, fetchDate, agendaVisibleDate, navigateMonth, goToday } = nav;

  const deferredViewMode = useDeferredValue(viewMode);
  const deferredCalDates = useDeferredValue(nav.calDates);
  const deferredDate = useDeferredValue(date);
  const deferredWeekStartsOn = useDeferredValue(weekStartsOn);
  const deferredIsCalendarMode = isCalMode(deferredViewMode);

  const [todayPending, setTodayPending] = useState(false);
  const handleToday = useCallback(() => {
    setTodayPending(true);
    goToday();
  }, [goToday]);
  useEffect(() => {
    if (todayPending && date === deferredDate && nav.calDates === deferredCalDates) {
      setTodayPending(false);
    }
  }, [todayPending, date, deferredDate, nav.calDates, deferredCalDates]);

  const { hourRowHeight, calendarKey, pinchGesture } = useZoom();
  const { activeAccount, calendars, allEvents, showFullOverlay, showSmallLoader } = useCalendarData(fetchDate);
  const { insets, onViewAreaLayout, heightFor, scrollOffset } = useCalendarLayout(allEvents, deferredWeekStartsOn, hourRowHeight);
  const drawer = useCalendarDrawer();

  const overlapMap = useMemo(() => computeOverlapMap(allEvents), [allEvents]);
  const calendarEvents = useMemo(() => toBigCalendarEvents(allEvents, overlapMap), [allEvents, overlapMap]);

  const navGuard = useRef(createNavigationGuard()).current;

  const handlePressEvent = useCallback(
    (event: any) => { navGuard(() => router.push(`/event/${event._event.uid}`)); },
    [router, navGuard]
  );
  const handlePressEventFromMonth = useCallback(
    (event: CalendarEvent) => { navGuard(() => router.push(`/event/${event.uid}`)); },
    [router, navGuard]
  );
  const handlePressCell = useCallback(
    (d: Date) => { navGuard(() => router.push({ pathname: '/event/new', params: { date: d.toISOString() } })); },
    [router, navGuard]
  );

  const monthSwipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-30, 30])
        .failOffsetY([-15, 15])
        .onEnd((e) => {
          if (e.translationX < -50) runOnJS(navigateMonth)(1);
          else if (e.translationX > 50) runOnJS(navigateMonth)(-1);
        }),
    [navigateMonth]
  );

  const renderEvent = useCallback((event: any, touchableOpacityProps: any) => {
    const { key, ...touchableProps } = touchableOpacityProps;
    return (
      <TimeGridEvent
        key={key}
        event={event}
        touchableProps={touchableProps}
        hourRowHeight={hourRowHeight}
        primaryColor={theme.primary}
      />
    );
  }, [hourRowHeight, theme.primary]);

  const eventCellStyle = useCallback(
    (event: any) => ({ backgroundColor: (event.color as string) || theme.primary }),
    [theme.primary]
  );

  const bigCalendarTheme = useMemo(
    () => ({
      palette: {
        primary: { main: theme.primary },
        gray: {
          '100': theme.borderSubtle,
          '200': theme.border,
          '500': theme.textSecondary,
          '800': theme.text,
        },
      },
    }),
    [theme.primary, theme.borderSubtle, theme.border, theme.textSecondary, theme.text]
  );

  const isToday = viewMode === 'schedule'
    ? dayjs(agendaVisibleDate).isSame(dayjs(), 'day')
    : dayjs(date).isSame(dayjs(), 'day');

  const headerTitle = useMemo(() => {
    const d = dayjs(viewMode === 'schedule' ? agendaVisibleDate : date);
    const monthYear = d.format('MMMM YYYY');
    if (viewMode === 'week' || viewMode === '3days' || viewMode === 'day') {
      return `${monthYear}  ·  W${d.isoWeek()}`;
    }
    return monthYear;
  }, [date, agendaVisibleDate, viewMode]);


  const calendarKeyFull = String(calendarKey);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <CalendarTopBar
        headerTitle={headerTitle}
        isToday={isToday}
        todayLoading={todayPending}
        viewMode={viewMode}
        onOpenDrawer={drawer.openDrawer}
        onToday={handleToday}
        onSwitchMode={nav.switchMode}
      />

      <OfflineBanner />

      <View style={styles.viewContainer} onLayout={onViewAreaLayout}>
        <View
          style={[styles.viewLayer, deferredViewMode === 'month' ? styles.layerActive : styles.layerHidden]}
          pointerEvents={deferredViewMode === 'month' ? 'auto' : 'none'}
        >
          <GestureDetector gesture={monthSwipeGesture}>
            <View style={{ flex: 1 }}>
              <MonthDayView
                date={deferredDate}
                events={allEvents}
                weekStartsOn={deferredWeekStartsOn}
                onSelectDate={nav.setDate}
                onPressEvent={handlePressEventFromMonth}
                onPressCell={handlePressCell}
              />
            </View>
          </GestureDetector>
        </View>

        <View
          style={[styles.viewLayer, deferredViewMode === 'schedule' ? styles.layerActive : styles.layerHidden]}
          pointerEvents={deferredViewMode === 'schedule' ? 'auto' : 'none'}
        >
          <AgendaView
            ref={nav.agendaRef}
            events={allEvents}
            date={date}
            onPressEvent={handlePressEventFromMonth}
            onPressCell={handlePressCell}
            onVisibleDateChange={nav.setAgendaVisibleDate}
          />
        </View>

        <View
          style={[styles.viewLayer, deferredIsCalendarMode ? styles.layerActive : styles.layerHidden]}
          pointerEvents={deferredIsCalendarMode ? 'auto' : 'none'}
        >
          <TimeGridView
            pinchGesture={pinchGesture}
            mountedCalModes={nav.mountedCalModes}
            viewMode={deferredViewMode}
            calendarKey={calendarKeyFull}
            events={calendarEvents}
            calDates={deferredCalDates}
            heightFor={heightFor}
            hourRowHeight={hourRowHeight}
            weekStartsOn={deferredWeekStartsOn}
            scrollOffset={scrollOffset}
            onPressEvent={handlePressEvent}
            onPressCell={handlePressCell}
            onSwipeEndHandlers={nav.onSwipeEndHandlers}
            renderEvent={renderEvent}
            eventCellStyle={eventCellStyle}
            bigCalendarTheme={bigCalendarTheme}
          />
        </View>
      </View>

      {showFullOverlay && (
        <View style={[styles.loadingOverlay, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading calendar…</Text>
        </View>
      )}
      {showSmallLoader && (
        <ActivityIndicator size="small" color={theme.textSecondary} style={styles.smallLoader} />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary, bottom: 16 }]}
        onPress={() => navGuard(() => router.push('/event/new'))}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <CalendarDrawer
        open={drawer.drawerOpen}
        drawerAnim={drawer.drawerAnim}
        overlayAnim={drawer.overlayAnim}
        insets={insets}
        activeAccount={activeAccount}
        calendars={calendars}
        hiddenCalendarIds={hiddenCalendarIds}
        toggleCalendarVisibility={toggleCalendarVisibility}
        onClose={drawer.closeDrawer}
        onNavigateSettings={() => { drawer.closeDrawer(); router.push('/(tabs)/settings'); }}
      />
    </View>
  );
}
