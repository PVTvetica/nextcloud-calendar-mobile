import { useEffect, useState } from 'react';

import { syncCalendars } from '@/database/sync';
import { useCalendarsFromDb } from '@/database/useCalendars';
import type { Account, CalendarMeta } from '@/types';


export function useCalendars(account: Account | null): { data: CalendarMeta[]; isFetching: boolean } {
  const data = useCalendarsFromDb(account?.id ?? null);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!account) return;
    let active = true;

    const run = (withSpinner: boolean) => {
      if (withSpinner) setIsFetching(true);
      syncCalendars(account)
        .catch(() => undefined)
        .finally(() => {
          if (active && withSpinner) setIsFetching(false);
        });
    };

    const first = setTimeout(() => run(true), 700);
    const poll = setInterval(() => run(false), 30000);

    return () => {
      active = false;
      clearTimeout(first);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id]);

  return { data, isFetching };
}
