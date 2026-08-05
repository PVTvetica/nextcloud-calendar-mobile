import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAccountStore } from '@/stores/accountStore';
import { useCalendarStore } from '@/stores/calendarStore';
import { EVENT_OBSERVED_COLUMNS } from '@/database/observedColumns';
import { trailingDebounce } from '@/utils/debounce';

import { observeAgendaEventsQuery } from '../core/readEvents';
import { readLiveEvent } from '../storage/widgetStore';
import { liveActivity } from '../surfaces/liveActivity';
import { registerWidgetBackgroundSync, unregisterWidgetBackgroundSync } from '../sync/backgroundSync';
import { AGENDA_DAYS, syncWidget } from '../sync/syncWidget';

const MAX_DELAY_MS = 60_000;
const BOUNDARY_MARGIN_MS = 1_000;
const MIN_DELAY_MS = 1_000;
const REFRESH_DEBOUNCE_MS = 3_000;

export function useWidgetSync(): void {
  const activeAccountId = useAccountStore((s) => s.activeAccountId);
  const hiddenCalendarIds = useCalendarStore((s) => s.hiddenCalendarIds);
  const widgetDisabledCalendarIds = useCalendarStore((s) => s.widgetDisabledCalendarIds);

  const skipFirstPrefsRun = useRef(true);
  useEffect(() => {
    if (skipFirstPrefsRun.current) {
      skipFirstPrefsRun.current = false;
      return;
    }
    void syncWidget();
  }, [hiddenCalendarIds, widgetDisabledCalendarIds]);

  useEffect(() => {
    if (!activeAccountId) {
      void unregisterWidgetBackgroundSync();
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (boundary: Date | null) => {
      if (cancelled) return;
      const untilBoundary = boundary
        ? boundary.getTime() - Date.now() + BOUNDARY_MARGIN_MS
        : Number.POSITIVE_INFINITY;
      const delay = Math.max(MIN_DELAY_MS, Math.min(MAX_DELAY_MS, untilBoundary));
      timer = setTimeout(run, delay);
    };

    const run = () => {
      void syncWidget().then(schedule);
    };


    const refresh = trailingDebounce(run, REFRESH_DEBOUNCE_MS);
    void liveActivity.requestPermission?.().catch(() => undefined);

    refresh.call();
    void registerWidgetBackgroundSync();

    const sub = observeAgendaEventsQuery(activeAccountId, AGENDA_DAYS)
      .observeWithColumns(EVENT_OBSERVED_COLUMNS)
      .subscribe(() => {
        refresh.call();
      });

    const handOffLiveActivity = () => {
      if (!liveActivity.handOff) return;
      const state = readLiveEvent();
      if (!state) return;
      void liveActivity.handOff(new Date(state.endIso)).catch(() => undefined);
    };

    const onAppState = (status: AppStateStatus) => {
      if (status === 'active') {
        clearTimeout(timer);
        refresh.call();
      } else if (status === 'background') {
        clearTimeout(timer);
        handOffLiveActivity();
      }
    };
    const appSub = AppState.addEventListener('change', onAppState);

    return () => {
      cancelled = true;
      refresh.cancel();
      sub.unsubscribe();
      clearTimeout(timer);
      appSub.remove();
    };
  }, [activeAccountId]);
}
