import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAccountStore } from '@/stores/accountStore';
import { EVENT_OBSERVED_COLUMNS } from '@/database/observedColumns';

import { observeAgendaEventsQuery } from '../core/readEvents';
import { liveActivity } from '../surfaces/liveActivity';
import { registerWidgetBackgroundSync, unregisterWidgetBackgroundSync } from '../sync/backgroundSync';
import { AGENDA_DAYS, syncWidget } from '../sync/syncWidget';

const REFRESH_MS = 60_000;

export function useWidgetSync(): void {
  const activeAccountId = useAccountStore((s) => s.activeAccountId);

  useEffect(() => {
    if (!activeAccountId) {
      void unregisterWidgetBackgroundSync();
      return;
    }

    void liveActivity.requestPermission?.().then(() => syncWidget());

    void syncWidget();
    void registerWidgetBackgroundSync();

    const sub = observeAgendaEventsQuery(activeAccountId, AGENDA_DAYS)
      .observeWithColumns(EVENT_OBSERVED_COLUMNS)
      .subscribe(() => {
        void syncWidget();
      });

    const tick = setInterval(() => {
      void syncWidget();
    }, REFRESH_MS);

    const onAppState = (status: AppStateStatus) => {
      if (status === 'active') void syncWidget();
    };
    const appSub = AppState.addEventListener('change', onAppState);

    return () => {
      sub.unsubscribe();
      clearInterval(tick);
      appSub.remove();
    };
  }, [activeAccountId]);
}
