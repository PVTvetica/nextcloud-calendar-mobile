import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';

import { syncEvents } from '@/database/sync';
import { useEventsForRange } from '@/database/useEvents';
import { useActiveAccount } from '@/hooks/useAccounts';
import { useCalendars } from '@/hooks/useCalendars';
import { useAccountStore } from '@/stores/accountStore';
import { useBookingStore } from '@/stores/bookingStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { normalizeEvents } from '@/utils/normalizeEvent';

import { buildWeekBoard, countFreeSlots, countSlots, startOfWeek } from '../utils/slots';

/**
 * Everything the booking screen needs for one week.
 *
 * Deliberately does NOT apply `hiddenCalendarIds`: the overview has to show the
 * real availability, so a calendar hidden in the calendar drawer still blocks
 * its slots.
 */
export function useBookingWeek(date: Date) {
  const activeAccountId = useAccountStore((s) => s.activeAccountId);
  const activeAccount = useActiveAccount(activeAccountId);
  const { data: calendars = [] } = useCalendars(activeAccount);

  const schedule = useBookingStore((s) => s.schedule);
  const slotMinutes = useBookingStore((s) => s.slotMinutes);
  const weekStartsOn = useSettingsStore((s) => s.weekStartsOn);

  const weekStart = useMemo(() => startOfWeek(date, weekStartsOn), [date, weekStartsOn]);
  const weekStartMs = weekStart.getTime();

  // Stable Date identities: useEventsForRange re-subscribes on every new object.
  const { start, end } = useMemo(
    () => ({
      start: new Date(weekStartMs),
      end: dayjs(weekStartMs).add(7, 'day').endOf('day').toDate(),
    }),
    [weekStartMs],
  );

  const dbEvents = useEventsForRange(activeAccountId ?? '', start, end);
  const [syncing, setSyncing] = useState(false);

  const runSync = useCallback(() => {
    if (!activeAccount || calendars.length === 0) return;
    if (calendars.some((c) => c.accountId !== activeAccount.id)) return;
    let active = true;
    setSyncing(true);
    // deleteMissing stays false: the calendar screen owns deletion for its own
    // month window, and this week overlaps it.
    syncEvents(activeAccount, calendars, start, end, false)
      .catch(() => undefined)
      .finally(() => {
        if (active) setSyncing(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccount?.id, calendars, start, end]);

  useEffect(() => runSync(), [runSync]);

  const events = useMemo(() => normalizeEvents(dbEvents), [dbEvents]);

  const days = useMemo(
    () => buildWeekBoard(weekStart, schedule, events, weekStartsOn, slotMinutes),
    [weekStart, schedule, events, weekStartsOn, slotMinutes],
  );

  const total = useMemo(() => countSlots(days), [days]);
  const free = useMemo(() => countFreeSlots(days), [days]);

  return { activeAccount, calendars, weekStart, days, total, free, syncing };
}
