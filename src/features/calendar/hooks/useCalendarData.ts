import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useFocusEffect } from 'expo-router';
import dayjs from 'dayjs';

import { syncEvents } from '@/database/sync';
import { useEventsForRange } from '@/database/useEvents';
import { useAccountStore } from '@/stores/accountStore';
import { useCalendarStore } from '@/stores/calendarStore';
import { useActiveAccount } from '@/hooks/useAccounts';
import { useCalendars } from '@/hooks/useCalendars';
import { normalizeEvents } from '@/utils/normalizeEvent';
import { monthRange, monthRangeAt } from '../utils/range';

const MIN_INTERVAL_MS = 5_000;

export function useCalendarData(date: Date) {
  const activeAccountId = useAccountStore((s) => s.activeAccountId);
  const hiddenCalendarIds = useCalendarStore((s) => s.hiddenCalendarIds);
  const activeAccount = useActiveAccount(activeAccountId);

  const { data: calendars = [], isFetching: calsFetching } = useCalendars(activeAccount);

  const year = dayjs(date).year();
  const month = dayjs(date).month();
  const { start, end } = useMemo(() => monthRange(date), [year, month]);

  const dbEvents = useEventsForRange(activeAccountId ?? '', start, end);

  const [syncing, setSyncing] = useState(false);
  const inFlight = useRef(false);
  const lastRunAt = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const runSync = useCallback(async (force: boolean) => {
    if (!activeAccount || calendars.length === 0) return;
    if (calendars.some((c) => c.accountId !== activeAccount.id)) {
      if (__DEV__) {
        console.warn('[useCalendarData] stale calendars for account, skipping sync', activeAccount.id);
      }
      return;
    }
    if (inFlight.current) return;
    if (!force && Date.now() - lastRunAt.current < MIN_INTERVAL_MS) return;

    inFlight.current = true;
    setSyncing(true);
    try {
      await syncEvents(activeAccount, calendars, start, end);
    } catch {
    } finally {
      lastRunAt.current = Date.now();
      inFlight.current = false;
      if (mounted.current) setSyncing(false);
    }

    const prev = monthRangeAt(date, -1);
    const next = monthRangeAt(date, 1);
    void syncEvents(activeAccount, calendars, prev.start, prev.end, false).catch(() => undefined);
    void syncEvents(activeAccount, calendars, next.start, next.end, false).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccount, calendars, start.getTime(), end.getTime(), date]);

  useEffect(() => {
    void runSync(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccount?.id, calendars, start.getTime(), end.getTime()]);

  useFocusEffect(useCallback(() => { void runSync(false); }, [runSync]));

  useEffect(() => {
    const onAppState = (status: AppStateStatus) => {
      if (status === 'active') void runSync(false);
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [runSync]);

  const allEvents = useMemo(
    () => normalizeEvents(dbEvents.filter((e) => !hiddenCalendarIds.includes(e.calendarId))),
    [dbEvents, hiddenCalendarIds],
  );

  const showSmallLoader = syncing || calsFetching;

  return { activeAccount, calendars, allEvents, showSmallLoader };
}
