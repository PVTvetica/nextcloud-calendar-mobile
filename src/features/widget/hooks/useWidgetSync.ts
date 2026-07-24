import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useAccountStore } from '@/stores/accountStore';

import { observeTodayEventsQuery } from '../core/readEvents';
import { syncWidget } from '../sync/syncWidget';

const FOREGROUND_REFRESH_MS = 60_000;

export function useWidgetSync(): void {
  const activeAccountId = useAccountStore((s) => s.activeAccountId);

  useEffect(() => {
    if (!activeAccountId) return;

    void syncWidget();

    const sub = observeTodayEventsQuery(activeAccountId)
      .observe()
      .subscribe(() => {
        void syncWidget();
      });

    const tick = setInterval(() => {
      if (AppState.currentState === 'active') void syncWidget();
    }, FOREGROUND_REFRESH_MS);

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
