import { useCallback, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'expo-router';
import { Check, Plus, X } from 'lucide-react-native';

import { useAccountStore } from '@/stores/accountStore';
import { useActiveAccount } from '@/hooks/useAccounts';
import { useCalendars } from '@/hooks/useCalendars';
import { useBookingStore } from '@/stores/bookingStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { SettingsPage } from '@/features/settings/components/SettingsPage';
import { SLOT_MINUTE_PRESETS } from '@/features/booking/constants';
import { formatHm } from '@/features/booking/utils/slots';
import { resolveBookingCalendar } from '@/features/booking/utils/blockEvent';
import {
  Button, Chip, Divider, Item, Sheet, Stack, Typography,
} from '@/ui/components';

const cardOuter = { marginHorizontal: 16, marginBottom: 12 };

export default function BookingSettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const activeAccountId = useAccountStore((s) => s.activeAccountId);
  const activeAccount = useActiveAccount(activeAccountId);
  const { data: calendars = [] } = useCalendars(activeAccount);
  const language = useSettingsStore((s) => s.language);
  const weekStartsOn = useSettingsStore((s) => s.weekStartsOn);

  // All editing state lives in the store: the settings stack is reset whenever
  // the tab loses focus, so screen-local drafts would be lost.
  const schedule = useBookingStore((s) => s.schedule);
  const slotMinutes = useBookingStore((s) => s.slotMinutes);
  const calendarId = useBookingStore((s) => s.calendarId);
  const setCalendarId = useBookingStore((s) => s.setCalendarId);
  const setSlotMinutes = useBookingStore((s) => s.setSlotMinutes);
  const addSlotTime = useBookingStore((s) => s.addSlotTime);
  const removeSlotTime = useBookingStore((s) => s.removeSlotTime);
  const resetSchedule = useBookingStore((s) => s.resetSchedule);

  const [pickerDay, setPickerDay] = useState<number | null>(null);
  const [pickerValue, setPickerValue] = useState(() => dayjs().hour(9).minute(0).second(0).toDate());

  const writableCalendars = useMemo(
    () => calendars.filter((c) => !c.isReadOnly && !c.isSubscribed),
    [calendars],
  );
  const effectiveCalendar = useMemo(
    () => resolveBookingCalendar(calendars, calendarId),
    [calendars, calendarId],
  );

  const weekdayOrder = useMemo(
    () => Array.from({ length: 7 }, (_, i) => (weekStartsOn + i) % 7),
    [weekStartsOn],
  );

  const openPicker = useCallback((day: number) => {
    setPickerValue(dayjs().hour(9).minute(0).second(0).toDate());
    setPickerDay(day);
  }, []);

  const commitTime = useCallback((day: number, date: Date) => {
    addSlotTime(day, formatHm(date.getHours(), date.getMinutes()));
  }, [addSlotTime]);

  const handleAndroidChange = useCallback((event: DateTimePickerEvent, date?: Date) => {
    const day = pickerDay;
    setPickerDay(null);
    if (event.type === 'set' && date && day !== null) commitTime(day, date);
  }, [pickerDay, commitTime]);

  return (
    <SettingsPage title={t('booking.settingsTitle')}>
      {/* Target calendar */}
      <Stack card gap={12} padding={16} hAlign="stretch" style={cardOuter}>
        <Stack gap={2}>
          <Typography variant="body1">{t('booking.calendarSection')}</Typography>
          <Typography variant="caption" color="secondary">
            {t('booking.calendarSectionHint')}
          </Typography>
        </Stack>

        {writableCalendars.length === 0 ? (
          <Typography variant="caption" color="secondary">
            {t('calendar.drawerNoCalendars')}
          </Typography>
        ) : (
          writableCalendars.map((cal, i) => (
            <Stack key={cal.id} gap={12} hAlign="stretch">
              {i > 0 && <Divider />}
              <Item
                onPress={() => setCalendarId(cal.id)}
                leading={
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: cal.color }} />
                }
                title={<Typography variant="body1" numberOfLines={1}>{cal.displayName}</Typography>}
                trailing={
                  effectiveCalendar?.id === cal.id
                    ? <Check size={20} color={colors.primary} />
                    : undefined
                }
              />
            </Stack>
          ))
        )}
      </Stack>

      {/* Slot length */}
      <Stack card gap={12} padding={16} hAlign="stretch" style={cardOuter}>
        <Stack gap={2}>
          <Typography variant="body1">{t('booking.durationSection')}</Typography>
          <Typography variant="caption" color="secondary">
            {t('booking.durationSectionHint')}
          </Typography>
        </Stack>
        <Stack direction="horizontal" gap={8} style={{ flexWrap: 'wrap' }}>
          {SLOT_MINUTE_PRESETS.map((minutes) => (
            <Chip
              key={minutes}
              active={slotMinutes === minutes}
              onPress={() => setSlotMinutes(minutes)}
            >
              {t('booking.minutes', { minutes })}
            </Chip>
          ))}
        </Stack>
      </Stack>

      {/* Weekly schedule */}
      <Stack card gap={12} padding={16} hAlign="stretch" style={cardOuter}>
        <Stack gap={2}>
          <Typography variant="body1">{t('booking.scheduleSection')}</Typography>
          <Typography variant="caption" color="secondary">
            {t('booking.scheduleSectionHint')}
          </Typography>
        </Stack>

        {weekdayOrder.map((day, i) => (
          <Stack key={day} gap={8} hAlign="stretch">
            {i > 0 && <Divider />}
            <Typography variant="body2">
              {dayjs().day(day).locale(language).format('dddd')}
            </Typography>
            <Stack direction="horizontal" gap={8} style={{ flexWrap: 'wrap' }}>
              {schedule[day].map((time) => (
                <Chip
                  key={time}
                  active
                  small
                  onPress={() => removeSlotTime(day, time)}
                  icon={<X size={14} color={colors.primaryText} />}
                >
                  {time}
                </Chip>
              ))}
              <Chip
                small
                onPress={() => openPicker(day)}
                icon={<Plus size={14} color={colors.text} />}
              >
                {t('booking.addTime')}
              </Chip>
            </Stack>
          </Stack>
        ))}

        <Divider />
        <Button
          inline
          variant="secondary"
          color="danger"
          title={t('booking.resetSchedule')}
          onPress={resetSchedule}
        />
      </Stack>

      {Platform.OS === 'android' && pickerDay !== null && (
        <DateTimePicker
          value={pickerValue}
          mode="time"
          is24Hour
          onChange={handleAndroidChange}
        />
      )}

      {Platform.OS !== 'android' && (
        <Sheet
          visible={pickerDay !== null}
          onClose={() => setPickerDay(null)}
          title={t('booking.addTime')}
        >
          <Stack gap={12} hAlign="stretch">
            <DateTimePicker
              value={pickerValue}
              mode="time"
              display="spinner"
              onChange={(_e, date) => date && setPickerValue(date)}
            />
            <Button
              variant="primary"
              title={t('booking.addTimeConfirm')}
              onPress={() => {
                if (pickerDay !== null) commitTime(pickerDay, pickerValue);
                setPickerDay(null);
              }}
            />
          </Stack>
        </Sheet>
      )}
    </SettingsPage>
  );
}
