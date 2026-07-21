import { QueryClient, MutationCache, type Mutation } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { DEFAULT_STALE, DEFAULT_GC } from './queryConfig';
import {
  rollbackEvents,
  reconcileCreatedEvent,
  refetchEventsTargeted,
  type EventMutationContext,
  type EventMutationMeta,
} from '@/shared/utils/eventMutationReconcile';
import type { CalendarEvent } from '@/types';
import i18n from '@/i18n';
import { HttpError } from './errors';

function statusOf(error: unknown): number | undefined {
  if (error instanceof HttpError) return error.status;
  const msg = error instanceof Error ? error.message : '';
  const match = msg.match(/\b(\d{3})\b/);
  return match ? Number(match[1]) : undefined;
}

export function describeMutationError(error: unknown): string {
  const status = statusOf(error);

  switch (status) {
    case 401:
      return i18n.t('common.errorAuth');
    case 403:
      return i18n.t('common.errorPermission');
    case 404:
      return i18n.t('common.errorNotFound');
    case 429: {
      const retryAfter = error instanceof HttpError ? error.retryAfter : undefined;
      return retryAfter
        ? i18n.t('common.errorRateLimitedRetry', { seconds: retryAfter })
        : i18n.t('common.errorRateLimited');
    }
  }

  if (status !== undefined && status >= 500) {
    return i18n.t('common.errorServer');
  }

  const msg = error instanceof Error ? error.message : String(error ?? '');
  if (/network|fetch|timeout|abort/i.test(msg)) {
    return i18n.t('common.errorNetwork');
  }
  return i18n.t('common.errorGeneric');
}

function eventMeta(mutation: Mutation<any, any, any, any>): EventMutationMeta | undefined {
  const meta = mutation.meta as EventMutationMeta | undefined;
  return meta?.eventMutation ? meta : undefined;
}


export function createQueryClient(): QueryClient {
  let client: QueryClient;

  const mutationCache = new MutationCache({
    onError: (error, _variables, context, mutation) => {
      const meta = eventMeta(mutation);
      if (!meta) return;
      const ctx = context as EventMutationContext | undefined;
      if (ctx?.previous) rollbackEvents(client, ctx.previous);
      Alert.alert(i18n.t(meta.errorTitleKey), describeMutationError(error));
    },

    onSuccess: (data, _variables, context, mutation) => {
      const meta = eventMeta(mutation);
      if (!meta) return;
      const ctx = context as EventMutationContext | undefined;
      if (meta.type === 'create' && ctx?.tempUid && data) {
        reconcileCreatedEvent(client, meta.accountId, ctx.tempUid, data as CalendarEvent);
      }
    },

    onSettled: (_data, _error, _variables, context, mutation) => {
      const meta = eventMeta(mutation);
      if (!meta) return;
      const ctx = context as EventMutationContext | undefined;
      if (ctx?.needsServerReconcile) refetchEventsTargeted(client, meta.accountId);
    },
  });

  client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE,
        gcTime: DEFAULT_GC,
        networkMode: 'offlineFirst',
        retry: 1,
      },
    },
    mutationCache,
  });

  return client;
}

export const queryClient = createQueryClient();
