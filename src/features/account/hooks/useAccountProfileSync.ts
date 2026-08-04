import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { saveAccount } from '@/services/nextcloud/auth';
import { fetchUserInfo } from '@/services/nextcloud/nextcloud';
import { refreshAccounts, useActiveAccount } from '@/hooks/useAccounts';
import { useAccountStore } from '@/stores/accountStore';
import type { Account } from '@/types';

export async function syncAccountProfile(account: Account): Promise<boolean> {
  const profile = await fetchUserInfo(account);
  if (!profile) return false;

  const next: Account = { ...account };
  let changed = false;

  if (profile.displayName && profile.displayName !== account.displayName) {
    next.displayName = profile.displayName;
    changed = true;
  }
  if (profile.email !== (account.email ?? '')) {
    next.email = profile.email;
    changed = true;
  }
  if (profile.timezone && profile.timezone !== account.timezone) {
    next.timezone = profile.timezone;
    changed = true;
  }

  if (!changed) return false;
  await saveAccount(next);
  await refreshAccounts();
  return true;
}

export function useAccountProfileSync(): void {
  const activeAccountId = useAccountStore((s) => s.activeAccountId);
  const account = useActiveAccount(activeAccountId);

  const lastRunAt = useRef(0);
  const inFlight = useRef(false);
  const accountRef = useRef(account);
  accountRef.current = account;

  const run = useCallback(async () => {
    const current = accountRef.current;
    if (!current || inFlight.current) return;
    if (Date.now() - lastRunAt.current < (5 * 60_000)) return;

    inFlight.current = true;
    try {
      await syncAccountProfile(current);
    } catch {
    } finally {
      lastRunAt.current = Date.now();
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!activeAccountId) return;
    lastRunAt.current = 0;
    void run();

    const onChange = (state: AppStateStatus) => {
      if (state === 'active') void run();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [activeAccountId, run]);
}
