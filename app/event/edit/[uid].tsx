import { useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { loadAccounts } from '@/services/nextcloud/auth';
import { fetchEvents } from '@/services/nextcloud/caldav';
import { useCalendars } from '@/hooks/useCalendars';
import { useUpdateEvent } from '@/hooks/useMutateEvent';
import { useAppStore } from '@/stores/appStore';
import { useTheme } from '@react-navigation/native';
import { EventForm } from '@/components/EventForm';
import { normalizeEvent, normalizeEvents } from '@/utils/normalizeEvent';
import { EVENTS_STALE } from '@/services/shared/queryConfig';
import type { CalendarEvent, CreateEventInput, RecurrenceEditScope } from '@/types';

export default function EditEventScreen() {
  const { uid, scope: scopeParam } = useLocalSearchParams<{ uid: string; scope?: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const activeAccountId = useAppStore((s) => s.activeAccountId);
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
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.textSecondary }}>{t('event.eventNotFound')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.colors.primary }}>{t('event.back')}</Text>
        </TouchableOpacity>
      </View>
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.headerBackground }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.cancel, { color: theme.colors.primary }]}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
          {t('event.editEvent')}{scopeLabel}
        </Text>
        <View style={styles.spacer} />
      </View>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: '600', flex: 1, textAlign: 'center' },
  cancel: { fontSize: 17, minWidth: 60 },
  spacer: { width: 60 },
});
