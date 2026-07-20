import { useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { loadAccounts } from '@/services/nextcloud/auth';
import { useCalendars } from '@/hooks/useCalendars';
import { useCreateEvent } from '@/hooks/useMutateEvent';
import { useAppStore } from '@/stores/appStore';
import { useTheme } from '@react-navigation/native';
import { EventForm } from '@/components/EventForm';
import type { CreateEventInput } from '@/types';

export default function NewEventScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const activeAccountId = useAppStore((s) => s.activeAccountId);

  const { data: accounts } = useQuery({ queryKey: ['accounts'], queryFn: loadAccounts });
  const activeAccount = accounts?.find((a) => a.id === activeAccountId) ?? null;
  const { data: calendars = [] } = useCalendars(activeAccount);

  const defaultDate = useMemo(() => (date ? new Date(date) : new Date()), [date]);

  const createMutation = useCreateEvent(activeAccount!, calendars);

  function handleSubmit(input: CreateEventInput) {
    if (!activeAccount) return;
    createMutation.mutate(input);
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/calendar');
  }

  if (!activeAccount || calendars.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.textSecondary }}>{t('event.loadingCalendars')}</Text>
      </View>
    );
  }

  const organizerEmail = activeAccount.username.includes('@')
    ? activeAccount.username
    : `${activeAccount.username}@${new URL(activeAccount.baseUrl).hostname}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.headerBackground }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.cancel, { color: theme.colors.primary }]}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t('event.newEvent')}</Text>
        <View style={styles.spacer} />
      </View>
      <EventForm
        calendars={calendars}
        defaultDate={defaultDate}
        organizerEmail={organizerEmail}
        organizerName={activeAccount.displayName}
        onSubmit={handleSubmit}
        loading={createMutation.isPending}
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
  title: { fontSize: 17, fontWeight: '600' },
  cancel: { fontSize: 17 },
  spacer: { width: 60 },
});
