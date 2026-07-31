import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAccountStore } from '@/stores/accountStore';
import { EVENT_OBSERVED_COLUMNS } from '@/database/observedColumns';
import { useSettingsStore } from '@/stores/settingsStore';
import { observeTodayEventsQuery } from '@/features/widget/core/readEvents';

import { scheduleEventAlerts } from './scheduleAlerts';

export function useEventAlerts(): void {
  const activeAccountId = useAccountStore((s) => s.activeAccountId);
  const timedAlert = useSettingsStore((s) => s.timedAlert);
  const allDayAlert = useSettingsStore((s) => s.allDayAlert);

  useEffect(() => {
    if (!activeAccountId) return;

    void scheduleEventAlerts();

    const sub = observeTodayEventsQuery(activeAccountId)
      .observeWithColumns(EVENT_OBSERVED_COLUMNS)
      .subscribe(() => {
        void scheduleEventAlerts();
      });

    const onAppState = (status: AppStateStatus) => {
      if (status === 'active') void scheduleEventAlerts();
    };
    const appSub = AppState.addEventListener('change', onAppState);

    return () => {
      sub.unsubscribe();
      appSub.remove();
    };
  }, [activeAccountId, timedAlert, allDayAlert]);
}
