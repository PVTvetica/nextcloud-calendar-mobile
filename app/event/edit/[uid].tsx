import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { loadAccounts } from '@/services/nextcloud/auth';
import { fetchEvents } from '@/services/nextcloud/caldav';
import { useCalendars } from '@/hooks/useCalendars';
import { useUpdateEvent } from '@/features/event/hooks/useMutateEvent';
import { useAccountStore } from '@/stores/accountStore';
import { EventForm } from '@/features/event/components/EventForm';
import {
  ViewContainer, Stack, Typography, Button, Spinner, ScreenHeader,
} from '@/ui/components';
import { normalizeEvent, normalizeEvents } from '@/utils/normalizeEvent';
import { EVENTS_STALE } from '@/services/shared/queryConfig';
import type { CalendarEvent, CreateEventInput, RecurrenceEditScope } from '@/types';

export default function EditEventScreen() {
  const { uid, scope: scopeParam } = useLocalSearchParams<{ uid: string; scope?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const activeAccountId = useAccountStore((s) => s.activeAccountId);
  const queryClient = useQueryClient();

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: loadAccounts });
  const activeAccount = accounts?.find((a) => a.id === activeAccountId) ?? null;
  const { data: calendars = [] } = useCalendars(activeAccount);

  const cachedEvent = useMemo((): CalendarEvent | undefined => {
    const allCached = queryClient.getQueriesData<CalendarEvent[]>({
      queryKey: [activeAccountId, 'events'],
    });
    for (const [, data] of allCached) {
      if (!Array.isArray(data)) continue;
      const found = data.find((e) => e.uid === uid);
      if (found) return normalizeEvent(found);
    }
    return undefined;
  }, [queryClient, activeAccountId, uid]);

  const start = useMemo(() => dayjs().subtract(3, 'months').toDate(), []);
  const end = useMemo(() => dayjs().add(3, 'months').toDate(), []);

  const { data: fetchedEvents = [], isLoading: eventsLoading } = useQuery<CalendarEvent[]>({
    queryKey: [activeAccountId, 'events-detail', start.toISOString(), end.toISOString()],
    queryFn: async () => {
      if (!activeAccount || calendars.length === 0) return [];
      const results = await Promise.all(
        calendars.map((cal) => fetchEvents(activeAccount, cal, start, end))
      );
      return results.flat();
    },
    enabled: activeAccount !== null && calendars.length > 0 && cachedEvent === undefined,
    staleTime: EVENTS_STALE,
  });

  const event: CalendarEvent | undefined = cachedEvent ?? normalizeEvents(fetchedEvents).find((e) => e.uid === uid);

  const scope: RecurrenceEditScope =
    scopeParam === 'this' ? 'this'
    : scopeParam === 'thisAndFollowing' ? 'thisAndFollowing'
    : 'all';

  const updateMutation = useUpdateEvent(activeAccount!, calendars);

  function handleSubmit(input: CreateEventInput) {
    if (!activeAccount || !event) return;
    updateMutation.mutate({ event, input, scope });
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/calendar');
  }

  const isLoading = eventsLoading && cachedEvent === undefined;

  if (isLoading || !activeAccount || calendars.length === 0) {
    return (
      <ViewContainer>
        <Stack flex vAlign="center" hAlign="center">
          <Spinner size="large" />
        </Stack>
      </ViewContainer>
    );
  }

  if (!event) {
    return (
      <ViewContainer>
        <Stack flex vAlign="center" hAlign="center" gap={16}>
          <Typography variant="body1" color="secondary">{t('event.eventNotFound')}</Typography>
          <Button variant="link" title={t('event.back')} onPress={() => router.back()} />
        </Stack>
      </ViewContainer>
    );
  }

  const organizerEmail = activeAccount.username.includes('@')
    ? activeAccount.username
    : `${activeAccount.username}@${new URL(activeAccount.baseUrl).hostname}`;

  const initialValues = {
    summary: event.summary,
    calendarId: event.calendarId,
    allDay: event.allDay,
    dtstart: event.dtstart,
    dtend: event.dtend,
    description: event.description ?? '',
    location: event.location ?? '',
    attendees: event.attendees,
  };

  const scopeLabel =
    scope === 'this' ? ` (${t('event.scopeThisOccurrence')})`
    : scope === 'thisAndFollowing' ? ` (${t('event.scopeThisAndFollowing')})`
    : '';

  return (
    <ViewContainer>
      <SafeAreaView style={styles.flex}>
        <ScreenHeader
          title={`${t('event.editEvent')}${scopeLabel}`}
          left={
            <Button
              variant="link" size="small" alignment="start"
              title={t('common.cancel')}
              onPress={() => router.back()}
            />
          }
        />
        <EventForm
          calendars={calendars}
          organizerEmail={organizerEmail}
          organizerName={activeAccount.displayName}
          onSubmit={handleSubmit}
          loading={updateMutation.isPending}
          initialValues={initialValues}
          submitLabel={t('event.updateEvent')}
          disableCalendarChange={event.isRecurring}
        />
      </SafeAreaView>
    </ViewContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
