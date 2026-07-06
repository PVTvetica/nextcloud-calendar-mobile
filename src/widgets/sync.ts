import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { useAppStore } from '@/store/appStore';
import type { CalendarEvent } from '@/types';
import { normalizeEvents } from '@/utils/normalizeEvent';
import { clearWidgetSnapshot, requestWidgetRefresh, writeWidgetSnapshot } from './WidgetBridge';
import { buildWidgetSnapshot } from './model';

type SyncWidgetSnapshotArgs = {
  queryClient: QueryClient;
  activeAccountId: string | null;
  hiddenCalendarIds: string[];
  notifiableCalendarIds: string[];
  now?: Date;
};

export function isWidgetEventQuery(queryKey: QueryKey, activeAccountId: string) {
  return Array.isArray(queryKey)
    && queryKey[0] === activeAccountId
    && (queryKey[1] === 'events' || queryKey[1] === 'subscribed-events');
}

function getCachedEvents(queryClient: QueryClient, activeAccountId: string) {
  const seen = new Set<string>();
  return normalizeEvents(
    queryClient
      .getQueriesData<CalendarEvent[]>({ queryKey: [activeAccountId] })
      .filter(([queryKey, data]) => isWidgetEventQuery(queryKey, activeAccountId) && Array.isArray(data))
      .flatMap(([, data]) => data ?? [])
  ).filter((event) => {
    const key = `${event.href}:${event.dtstart.toISOString()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hasEventCache(queryClient: QueryClient, activeAccountId: string) {
  return queryClient
    .getQueriesData<CalendarEvent[]>({ queryKey: [activeAccountId] })
    .some(([queryKey, data]) => isWidgetEventQuery(queryKey, activeAccountId) && Array.isArray(data));
}

export async function syncWidgetSnapshot({
  queryClient,
  activeAccountId,
  hiddenCalendarIds,
  notifiableCalendarIds,
  now = new Date(),
}: SyncWidgetSnapshotArgs) {
  if (!activeAccountId) {
    await clearWidgetSnapshot();
    await requestWidgetRefresh();
    return;
  }

  if (!hasEventCache(queryClient, activeAccountId)) {
    return;
  }

  const snapshot = buildWidgetSnapshot({
    activeAccountId,
    hiddenCalendarIds,
    notifiableCalendarIds,
    events: getCachedEvents(queryClient, activeAccountId),
    now,
  });

  if (snapshot.medium) await writeWidgetSnapshot(snapshot);
  else await clearWidgetSnapshot();
  await requestWidgetRefresh();
}

export function WidgetSyncBootstrap() {
  const queryClient = useQueryClient();
  const activeAccountId = useAppStore((state) => state.activeAccountId);
  const hiddenCalendarIds = useAppStore((state) => state.hiddenCalendarIds);
  const notifiableCalendarIds = useAppStore((state) => state.notifiableCalendarIds);

  useEffect(() => {
    const sync = () => syncWidgetSnapshot({
      queryClient,
      activeAccountId,
      hiddenCalendarIds,
      notifiableCalendarIds,
    });

    void sync();

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (activeAccountId && isWidgetEventQuery(event.query.queryKey, activeAccountId)) void sync();
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });

    return () => {
      unsubscribe();
      appState.remove();
    };
  }, [activeAccountId, hiddenCalendarIds, notifiableCalendarIds, queryClient]);

  return null;
}
