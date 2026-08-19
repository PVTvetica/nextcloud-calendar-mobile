import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useTheme } from 'expo-router';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { CalendarCog, ChevronLeft, ChevronRight } from 'lucide-react-native';

import { useSettingsStore } from '@/stores/settingsStore';
import { useBookingStore } from '@/stores/bookingStore';
import { useBookingWeek } from '@/features/booking/hooks/useBookingWeek';
import { BookingSlotRow } from '@/features/booking/components/BookingSlotRow';
import { BlockSlotSheet } from '@/features/booking/components/BlockSlotSheet';
import { buildBlockEventInput, resolveBookingCalendar } from '@/features/booking/utils/blockEvent';
import type { BookingSlot, BookingSlotStatus } from '@/features/booking/types';
import { useCreateEvent } from '@/features/event/hooks/useMutateEvent';
import { resolveOrganizer } from '@/features/event/utils/organizer';
import { createNavigationGuard } from '@/utils/navigationGuard';
import {
  Button, IconButton, List, ScreenHeader, SectionHeader, Spinner, Stack, Typography, ViewContainer,
} from '@/ui/components';

dayjs.extend(localizedFormat);

const MAX_CONTENT_WIDTH = 700;

export default function BookingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const language = useSettingsStore((s) => s.language);
  const preferredCalendarId = useBookingStore((s) => s.calendarId);

  const [anchor, setAnchor] = useState(() => new Date());
  const { activeAccount, calendars, weekStart, days, total, free, syncing } = useBookingWeek(anchor);

  const [pendingSlot, setPendingSlot] = useState<BookingSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navGuard = useRef(createNavigationGuard()).current;

  const targetCalendar = useMemo(
    () => resolveBookingCalendar(calendars, preferredCalendarId),
    [calendars, preferredCalendarId],
  );

  // Must run unconditionally (hooks order); the handler below guards on account.
  const createEvent = useCreateEvent(activeAccount!, calendars);
  const { mutateAsync } = createEvent;

  const weekLabel = useMemo(() => {
    const start = dayjs(weekStart).locale(language);
    const end = start.add(6, 'day');
    return `${start.format('D. MMM')} – ${end.format('D. MMM YYYY')}`;
  }, [weekStart, language]);

  const isCurrentWeek = useMemo(
    () => dayjs().isAfter(dayjs(weekStart)) && dayjs().isBefore(dayjs(weekStart).add(7, 'day')),
    [weekStart],
  );

  const shiftWeek = useCallback((weeks: number) => {
    setAnchor((prev) => dayjs(prev).add(weeks, 'week').toDate());
  }, []);

  const handlePressSlot = useCallback((status: BookingSlotStatus) => {
    if (status.busy) {
      const event = status.events[0];
      if (event) navGuard(() => router.push(`/event/${encodeURIComponent(event.uid)}`));
      return;
    }
    setPendingSlot(status.slot);
  }, [router, navGuard]);

  const handleConfirmBlock = useCallback(async (summary: string) => {
    if (!activeAccount || !targetCalendar || !pendingSlot) return;
    setSubmitting(true);
    try {
      await mutateAsync(buildBlockEventInput({
        slot: pendingSlot,
        calendarId: targetCalendar.id,
        summary,
        ...resolveOrganizer(activeAccount),
      }));
      setPendingSlot(null);
    } finally {
      setSubmitting(false);
    }
  }, [activeAccount, targetCalendar, pendingSlot, mutateAsync]);

  const openSettings = useCallback(
    () => navGuard(() => router.push('/(tabs)/settings/booking')),
    [router, navGuard],
  );

  return (
    <ViewContainer>
      <SafeAreaView edges={['top']} style={styles.flex}>
        <View style={styles.column}>
          <ScreenHeader
            title={t('booking.title')}
            right={
              <IconButton
                variant="ghost"
                round
                size={40}
                onPress={openSettings}
                accessibilityLabel={t('booking.settingsTitle')}
              >
                <CalendarCog size={22} color={colors.text} />
              </IconButton>
            }
          />

          <Stack direction="horizontal" vAlign="center" gap={4} style={styles.weekBar}>
            <IconButton
              variant="ghost"
              round
              size={40}
              onPress={() => shiftWeek(-1)}
              accessibilityLabel={t('booking.previousWeek')}
            >
              <ChevronLeft size={22} color={colors.text} />
            </IconButton>

            <Stack gap={2} hAlign="center" style={styles.grow}>
              <Typography variant="body2">{weekLabel}</Typography>
              <Typography variant="caption" color="secondary">
                {total > 0 ? t('booking.summary', { free, total }) : t('booking.noSlots')}
              </Typography>
            </Stack>

            <IconButton
              variant="ghost"
              round
              size={40}
              onPress={() => shiftWeek(1)}
              accessibilityLabel={t('booking.nextWeek')}
            >
              <ChevronRight size={22} color={colors.text} />
            </IconButton>
          </Stack>

          {!isCurrentWeek && (
            <Stack hAlign="center" style={styles.todayRow}>
              <Button
                inline
                variant="link"
                title={t('calendar.today')}
                onPress={() => setAnchor(new Date())}
              />
            </Stack>
          )}
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
        >
          {!activeAccount ? (
            <Typography variant="caption" color="secondary" align="center" style={styles.hint}>
              {t('booking.noAccount')}
            </Typography>
          ) : days.length === 0 ? (
            <Stack gap={12} hAlign="center" style={styles.hint}>
              <Typography variant="caption" color="secondary" align="center">
                {t('booking.emptyScheduleHint')}
              </Typography>
              <Button
                inline
                variant="secondary"
                color="text"
                title={t('booking.openSettings')}
                onPress={openSettings}
              />
            </Stack>
          ) : (
            days.map((day) => (
              <Stack key={day.dayKey} style={styles.section} hAlign="stretch">
                <SectionHeader
                  title={dayjs(day.date).locale(language).format('dddd, D. MMM')}
                  trailing={
                    <Typography variant="caption" color="secondary">
                      {t('booking.daySummary', {
                        free: day.slots.filter((s) => !s.busy).length,
                        total: day.slots.length,
                      })}
                    </Typography>
                  }
                />
                <List>
                  {day.slots.map((status) => (
                    <BookingSlotRow
                      key={status.slot.key}
                      status={status}
                      language={language}
                      onPress={handlePressSlot}
                    />
                  ))}
                </List>
              </Stack>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      {syncing && <Spinner size="small" color="secondary" style={styles.loader} />}

      <BlockSlotSheet
        slot={pendingSlot}
        busy={submitting}
        calendarName={targetCalendar?.displayName}
        onClose={() => setPendingSlot(null)}
        onConfirm={handleConfirmBlock}
      />
    </ViewContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flex: 1 },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  weekBar: { paddingHorizontal: 12, paddingBottom: 4 },
  todayRow: { paddingBottom: 4 },
  content: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  section: { marginTop: 16 },
  hint: { marginTop: 48 },
  loader: { position: 'absolute', bottom: 24, left: 16 },
});
