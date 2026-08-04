import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAccountStore } from '@/stores/accountStore';
import { EVENT_OBSERVED_COLUMNS } from '@/database/observedColumns';
import { useSettingsStore } from '@/stores/settingsStore';
import { observeTodayEventsQuery } from '@/features/widget/core/readEvents';
import { trailingDebounce } from '@/utils/debounce';

import { scheduleEventAlerts } from './scheduleAlerts';

const RESCHEDULE_DEBOUNCE_MS = 3000;

export function useEventAlerts(): void {
  const activeAccountId = useAccountStore((s) => s.activeAccountId);
  const timedAlert = useSettingsStore((s) => s.timedAlert);
  const allDayAlert = useSettingsStore((s) => s.allDayAlert);

  useEffect(() => {
    if (!activeAccountId) return;

    const schedule = trailingDebounce(() => { void scheduleEventAlerts(); }, RESCHEDULE_DEBOUNCE_MS);

    schedule.call();

    const sub = observeTodayEventsQuery(activeAccountId)
      .observeWithColumns(EVENT_OBSERVED_COLUMNS)
      .subscribe(() => {
        schedule.call();
      });

    const onAppState = (status: AppStateStatus) => {
      if (status === 'active') schedule.call();
    };
    const appSub = AppState.addEventListener('change', onAppState);

    return () => {
      schedule.cancel();
      sub.unsubscribe();
      appSub.remove();
    };
  }, [activeAccountId, timedAlert, allDayAlert]);
}
