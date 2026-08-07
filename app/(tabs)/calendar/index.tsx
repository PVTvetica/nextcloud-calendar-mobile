import { useCallback, useDeferredValue, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { useCalendarStore } from '@/stores/calendarStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { ViewContainer, Spinner } from '@/ui/components';
import { CalendarDrawer } from '@/features/calendar/components/CalendarDrawer';
import { OfflineBanner } from '@/features/calendar/components/OfflineBanner';
import { MonthDayView } from '@/features/calendar/components/MonthDayView';
import { AgendaView } from '@/features/calendar/components/AgendaView';
import { computeOverlapMap } from '@/features/calendar/utils/overlapMap';
import { createNavigationGuard } from '@/utils/navigationGuard';
import type { CalendarEvent } from '@/types';
import { useCalendarNavigation } from '@/features/calendar/hooks/useCalendarNavigation';
import { useCalendarData } from '@/features/calendar/hooks/useCalendarData';
import { useCalendarDrawer } from '@/features/calendar/hooks/useCalendarDrawer';
import { useZoom } from '@/features/calendar/hooks/useZoom';
import { CalendarTopBar } from '@/features/calendar/components/CalendarTopBar';
import { TimeGridView } from '@/features/calendar/components/TimeGridView';
import { ViewLayer } from '@/features/calendar/components/ViewLayer';
import { CalendarFab } from '@/features/calendar/components/CalendarFab';
import { CalendarLoadingOverlay } from '@/features/calendar/components/CalendarLoadingOverlay';
import { toGridEvents } from '@/features/calendar/utils/toGridEvents';
import { isCalMode, type CalMode } from '@/features/calendar/constants';

dayjs.extend(isoWeek);

export default function CalendarScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const weekStartsOn = useSettingsStore((s) => s.weekStartsOn);
  const language = useSettingsStore((s) => s.language);
  const hiddenCalendarIds = useCalendarStore((s) => s.hiddenCalendarIds);
  const toggleCalendarVisibility = useCalendarStore((s) => s.toggleCalendarVisibility);

  const nav = useCalendarNavigation();
  // navigateMonth is destructured, not read as nav.navigateMonth: a worklet
  // closure captures the base object of a member expression, so `nav.x` inside
  // the pan handler below would drag the whole nav object — Dates included —
  // onto the UI runtime, where Worklets cannot copy them.
  const { viewMode, date, fetchDate, agendaVisibleDate, navigateMonth } = nav;

  const deferredViewMode = useDeferredValue(viewMode);
  const deferredDate = useDeferredValue(date);
  const deferredAnchorDate = useDeferredValue(nav.anchorDate);
  const deferredWeekStartsOn = useDeferredValue(weekStartsOn);
  const deferredIsCalendarMode = isCalMode(deferredViewMode);
  // TimeGridView stays mounted under ViewLayer (opacity/display toggling, not
  // unmounting) so it keeps receiving `mode` while month/schedule are active;
  // guard explicitly rather than casting a non-CalMode past the type checker.
  // Latch the last real CalMode in a ref rather than falling back to a fixed
  // default: falling back to 'week' while month/schedule are active flips the
  // still-mounted grid's mode on every navigation into and out of those views,
  // invalidating datesForIndex and re-rendering every column for nothing.
  const lastCalModeRef = useRef<CalMode>('week');
  if (isCalMode(deferredViewMode)) lastCalModeRef.current = deferredViewMode;
  const calMode: CalMode = lastCalModeRef.current;

  const { hourRowHeight, pinchGesture } = useZoom();
  const { activeAccount, calendars, allEvents, showFullOverlay, showSmallLoader } = useCalendarData(fetchDate);
  const insets = useSafeAreaInsets();
  const drawer = useCalendarDrawer();

  const overlapMap = useMemo(() => computeOverlapMap(allEvents), [allEvents]);
  const calendarEvents = useMemo(() => toGridEvents(allEvents, overlapMap), [allEvents, overlapMap]);

  const allDayEvents = useMemo(() => allEvents.filter((e) => e.allDay), [allEvents]);
  const nowHour = useMemo(() => Math.max(0, new Date().getHours() - 1), []);

  const navGuard = useRef(createNavigationGuard()).current;

  const handlePressGridEvent = useCallback(
    (event: { _event: CalendarEvent }) => {
      navGuard(() => router.push(`/event/${encodeURIComponent(event._event.uid)}`));
    },
    [router, navGuard]
  );
  const handlePressEventFromMonth = useCallback(
    (event: CalendarEvent) => { navGuard(() => router.push(`/event/${encodeURIComponent(event.uid)}`)); },
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
          if (e.translationX < -50) scheduleOnRN(navigateMonth, 1);
          else if (e.translationX > 50) scheduleOnRN(navigateMonth, -1);
        }),
    [navigateMonth]
  );

  const isToday = viewMode === 'schedule'
    ? dayjs(agendaVisibleDate).isSame(dayjs(), 'day')
    : dayjs(date).isSame(dayjs(), 'day');

  const headerTitle = useMemo(() => {
    const d = dayjs(viewMode === 'schedule' ? agendaVisibleDate : date);
    const monthYear = d.locale(language).format('MMMM YYYY');
    if (viewMode === 'week' || viewMode === '3days' || viewMode === 'day') {
      return `${monthYear}  ·  ${t('calendar.weekAbbr')}${d.isoWeek()}`;
    }
    return monthYear;
  }, [date, agendaVisibleDate, viewMode, language, t]);

  return (
    <ViewContainer>
      <CalendarTopBar
        headerTitle={headerTitle}
        isToday={isToday}
        viewMode={viewMode}
        onOpenDrawer={drawer.openDrawer}
        onToday={nav.goToday}
        onSwitchMode={nav.switchMode}
      />

      <OfflineBanner />

      <View style={styles.viewArea}>
        <ViewLayer visible={deferredViewMode === 'month'}>
          <GestureDetector gesture={monthSwipeGesture}>
            <View style={styles.fill}>
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
        </ViewLayer>

        <ViewLayer visible={deferredViewMode === 'schedule'}>
          <AgendaView
            ref={nav.agendaRef}
            events={allEvents}
            date={date}
            onPressEvent={handlePressEventFromMonth}
            onPressCell={handlePressCell}
            onVisibleDateChange={nav.setAgendaVisibleDate}
          />
        </ViewLayer>

        <ViewLayer visible={deferredIsCalendarMode}>
          <TimeGridView
            mode={calMode}
            anchorDate={deferredAnchorDate}
            activeDate={deferredDate}
            events={calendarEvents}
            allDayEvents={allDayEvents}
            hourRowHeight={hourRowHeight}
            weekStartsOn={deferredWeekStartsOn}
            jump={nav.jump}
            pinchGesture={pinchGesture}
            initialScrollHour={nowHour}
            onPageChange={nav.onPageChange}
            onPressSlot={handlePressCell}
            onPressEvent={handlePressGridEvent}
            onPressAllDayEvent={handlePressEventFromMonth}
          />
        </ViewLayer>
      </View>

      {showFullOverlay && <CalendarLoadingOverlay label={t('calendar.loadingCalendar')} />}
      {showSmallLoader && <Spinner size="small" color="secondary" style={styles.smallLoader} />}

      <CalendarFab onPress={() => navGuard(() => router.push('/event/new'))} />

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
    </ViewContainer>
  );
}

const styles = StyleSheet.create({
  viewArea: { flex: 1 },
  fill: { flex: 1 },
  smallLoader: { position: 'absolute', bottom: 24, left: 16, zIndex: 5 },
});
