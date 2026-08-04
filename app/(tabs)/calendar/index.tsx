import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { useRouter, useTheme } from 'expo-router';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { Calendar } from '@super-calendar/native';
import { useSettingsStore } from '@/stores/settingsStore';
import { ViewContainer, Spinner } from '@/ui/components';
import { CalendarDrawer } from '@/features/calendar/components/CalendarDrawer';
import { OfflineBanner } from '@/features/calendar/components/OfflineBanner';
import { MonthDayView } from '@/features/calendar/components/MonthDayView';
import { AgendaView } from '@/features/calendar/components/AgendaView';
import { createNavigationGuard } from '@/utils/navigationGuard';
import type { CalendarEvent } from '@/types';
import { useCalendarNavigation } from '@/features/calendar/hooks/useCalendarNavigation';
import { useCalendarData } from '@/features/calendar/hooks/useCalendarData';
import { useCalendarDrawer } from '@/features/calendar/hooks/useCalendarDrawer';
import { useCalendarPrefs } from '@/features/calendar/hooks/useCalendarPrefs';
import { useEventDrag } from '@/features/calendar/hooks/useEventDrag';
import { useZoom } from '@/features/calendar/hooks/useZoom';
import { CalendarTopBar } from '@/features/calendar/components/CalendarTopBar';
import { EventCell } from '@/features/calendar/components/EventCell';
import { ViewLayer } from '@/features/calendar/components/ViewLayer';
import { CalendarFab } from '@/features/calendar/components/CalendarFab';
import {
  calendarLocale, calendarTheme, toSuperEvents, type SuperEvent,
} from '@/features/calendar/utils/calendar';
import { isCalMode } from '@/features/calendar/constants';

dayjs.extend(isoWeek);

export default function CalendarScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  const insets = useSafeAreaInsets();
  const weekStartsOn = useSettingsStore((s) => s.weekStartsOn);
  const language = useSettingsStore((s) => s.language);
  const calendarPrefs = useCalendarPrefs();

  const nav = useCalendarNavigation();
  const { viewMode, date, fetchDate, agendaVisibleDate, navigateMonth, goToday } = nav;

  const deferredViewMode = useDeferredValue(viewMode);
  const deferredDate = useDeferredValue(date);
  const deferredWeekStartsOn = useDeferredValue(weekStartsOn);
  const deferredIsCalendarMode = isCalMode(deferredViewMode);

  const [todayPending, setTodayPending] = useState(false);
  const handleToday = useCallback(() => {
    setTodayPending(true);
    goToday();
  }, [goToday]);
  useEffect(() => {
    if (todayPending && date === deferredDate) setTodayPending(false);
  }, [todayPending, date, deferredDate]);

  const { hourRowHeight, cellHeight } = useZoom();
  const { activeAccount, calendars, allEvents, showSmallLoader } = useCalendarData(fetchDate);
  const drawer = useCalendarDrawer();

  const scrollOffsetMinutes = useMemo(() => {
    const now = new Date();
    return Math.max(0, now.getHours() * 60 + now.getMinutes() - 60);
  }, []);

  const superEvents = useMemo(() => toSuperEvents(allEvents), [allEvents]);
  const locale = useMemo(() => calendarLocale(language), [language]);
  const scTheme = useMemo(() => calendarTheme(theme.colors, theme.dark), [theme.colors, theme.dark]);

  const { onDragEvent, onDragStart } = useEventDrag(activeAccount, calendars);

  const navGuard = useRef(createNavigationGuard()).current;

  const openEvent = useCallback((uid: string) => {
    navGuard(() => router.push(`/event/${encodeURIComponent(uid)}`));
  }, [router, navGuard]);

  const handlePressEvent = useCallback(
    (event: SuperEvent) => { openEvent(event.source.uid); },
    [openEvent]
  );
  const handlePressEventFromMonth = useCallback(
    (event: CalendarEvent) => { openEvent(event.uid); },
    [openEvent]
  );
  const handlePressCell = useCallback(
    (d: Date) => { navGuard(() => router.push({ pathname: '/event/new', params: { date: d.toISOString() } })); },
    [router, navGuard]
  );

  const handleCreateEvent = useCallback(() => {
    const base = viewMode === 'schedule' ? agendaVisibleDate : date;
    const now = new Date();
    const start = dayjs(base).hour(now.getHours()).minute(now.getMinutes()).second(0).millisecond(0);
    navGuard(() => router.push({ pathname: '/event/new', params: { date: start.toISOString() } }));
  }, [viewMode, agendaVisibleDate, date, router, navGuard]);

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
        todayLoading={todayPending}
        viewMode={viewMode}
        onOpenDrawer={drawer.openDrawer}
        onToday={handleToday}
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
          <View style={styles.fill}>
            <Calendar
              mode={deferredIsCalendarMode ? deferredViewMode : 'week'}
              date={date}
              events={superEvents}
              onChangeDate={nav.onChangeDate}
              onPressEvent={handlePressEvent}
              onPressCell={handlePressCell}
              onDragEvent={onDragEvent}
              onDragStart={onDragStart}
              renderEvent={EventCell}
              keyExtractor={(event) => event.id}
              weekStartsOn={deferredWeekStartsOn}
              cellHeight={cellHeight}
              hourHeight={hourRowHeight}
              scrollOffsetMinutes={scrollOffsetMinutes}
              locale={locale}
              theme={scTheme}
            />
          </View>
        </ViewLayer>
      </View>

      {showSmallLoader && (
        <Spinner size="small" color="secondary" pointerEvents="none" style={styles.smallLoader} />
      )}

      <CalendarFab onPress={handleCreateEvent} />

      <CalendarDrawer
        open={drawer.drawerOpen}
        drawerAnim={drawer.drawerAnim}
        overlayAnim={drawer.overlayAnim}
        drawerWidth={drawer.drawerWidth}
        insets={insets}
        activeAccount={activeAccount}
        calendars={calendars}
        hiddenCalendarIds={calendarPrefs.hiddenCalendarIds}
        notifDisabledCalendarIds={calendarPrefs.notifDisabledCalendarIds}
        toggleCalendarVisibility={calendarPrefs.setVisibility}
        toggleCalendarNotifications={calendarPrefs.setNotifications}
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
