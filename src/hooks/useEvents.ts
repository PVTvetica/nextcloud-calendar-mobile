import { useQuery } from '@tanstack/react-query';
import { fetchEvents } from '@/api/caldav';
import type { Account, CalendarMeta } from '@/types';

export function useEvents(account: Account | null, calendar: CalendarMeta | null, start: Date, end: Date) {
  return useQuery({
    queryKey: [account?.id, 'events', calendar?.id, start.toISOString(), end.toISOString()],
    queryFn: () => fetchEvents(account!, calendar!, start, end),
    enabled: account !== null && calendar !== null,
    staleTime: 2 * 60 * 1000,
  });
}
