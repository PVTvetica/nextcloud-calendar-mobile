import { useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Switch,
  StyleSheet, ScrollView, Platform, KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@react-navigation/native';
import { TalkToggle } from './TalkToggle';
import { RecurrencePicker } from './RecurrencePicker';
import type { CalendarMeta, Attendee, CreateEventInput, RecurrenceRule, TalkRoomType } from '@/types';

dayjs.extend(localizedFormat);

interface InitialValues {
  summary?: string;
  calendarId?: string;
  allDay?: boolean;
  dtstart?: Date;
  dtend?: Date;
  description?: string;
  location?: string;
  attendees?: Attendee[];
  rrule?: RecurrenceRule;
}

interface Props {
  calendars: CalendarMeta[];
  defaultDate?: Date;
  organizerEmail: string;
  organizerName: string;
  onSubmit: (input: CreateEventInput) => void;
  loading: boolean;
  initialValues?: InitialValues;
  submitLabel?: string;
  disableCalendarChange?: boolean;
}



type AndroidPickerStep = null | { target: 'start' | 'end'; step: 'date' | 'time'; partial?: Date };

export function EventForm({
  calendars, defaultDate, organizerEmail, organizerName, onSubmit, loading,
  initialValues, submitLabel, disableCalendarChange = false,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  const [summary, setSummary] = useState(initialValues?.summary ?? '');
  const writableCalendars = calendars.filter((c) => !c.isReadOnly && !c.isSubscribed);

  const defaultCalendarId =
    initialValues?.calendarId ??
    writableCalendars.find((c) => c.slug.toLowerCase() === 'personal')?.id ??
    writableCalendars[0]?.id ?? '';
  const [calendarId, setCalendarId] = useState(defaultCalendarId);
  const [allDay, setAllDay] = useState(initialValues?.allDay ?? false);
  const [dtstart, setDtstart] = useState(initialValues?.dtstart ?? defaultDate ?? new Date());
  const [dtend, setDtend] = useState(
    initialValues?.dtend ?? (defaultDate ? dayjs(defaultDate).add(1, 'hour').toDate() : dayjs().add(1, 'hour').toDate())
  );
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [location, setLocation] = useState(initialValues?.location ?? '');
  const [withTalkRoom, setWithTalkRoom] = useState(false);
  const [talkRoomType, setTalkRoomType] = useState<TalkRoomType>('private');
  const [attendeeInput, setAttendeeInput] = useState('');
  const [attendees, setAttendees] = useState<Attendee[]>(initialValues?.attendees ?? []);
  const [rrule, setRrule] = useState<RecurrenceRule | undefined>(initialValues?.rrule);
  const [error, setError] = useState<string | null>(null);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [androidStep, setAndroidStep] = useState<AndroidPickerStep>(null);

  const scrollRef = useRef<ScrollView>(null);
  const attendeeFocused = useRef(false);
  const inputOffsets = useRef<Record<string, number>>({});

  function scrollToField(key: string) {
    const y = inputOffsets.current[key];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
  }

  function onFieldLayout(key: string, event: any) {
    inputOffsets.current[key] = event.nativeEvent.layout.y;
  }

  function openStartPicker() {
    if (Platform.OS === 'android') {
      setAndroidStep({ target: 'start', step: 'date' });
    } else {
      setShowEndPicker(false);
      setShowStartPicker((v) => !v);
    }
  }

  function openEndPicker() {
    if (Platform.OS === 'android') {
      setAndroidStep({ target: 'end', step: 'date' });
    } else {
      setShowStartPicker(false);
      setShowEndPicker((v) => !v);
    }
  }

  function handleIosStartChange(_: any, d?: Date) {
    if (d) setDtstart(d);
  }

  function handleIosEndChange(_: any, d?: Date) {
    if (d) setDtend(d);
  }

  function handleAndroidChange(_: any, selected?: Date) {
    if (!androidStep) return;

    if (selected === undefined) {
      setAndroidStep(null);
      return;
    }

    const { target, step } = androidStep;

    if (allDay || step === 'time') {
      const base = step === 'time' && androidStep.partial ? androidStep.partial : selected;
      let finalDate: Date;
      if (step === 'time') {
        const d = new Date(androidStep.partial!);
        d.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
        finalDate = d;
      } else {
        finalDate = base;
      }
      if (target === 'start') setDtstart(finalDate);
      else setDtend(finalDate);
      setAndroidStep(null);
    } else {
      setAndroidStep({ target, step: 'time', partial: selected });
    }
  }

  function addAttendee() {
    const email = attendeeInput.trim();
    if (!email || !email.includes('@')) return;
    setAttendees((prev) => [...prev, { email }]);
    setAttendeeInput('');
  }

  function removeAttendee(email: string) {
    setAttendees((prev) => prev.filter((a) => a.email !== email));
  }

  function handleSubmit() {
    if (!summary.trim()) { setError(t('event.errorTitleRequired')); return; }
    if (!calendarId) { setError(t('event.errorSelectCalendar')); return; }
    if (allDay) {
      if (dayjs(dtend).startOf('day').isBefore(dayjs(dtstart).startOf('day'))) {
        setError(t('event.errorEndAfterStart')); return;
      }
    } else if (dtend <= dtstart) {
      setError(t('event.errorEndAfterStart')); return;
    }
    setError(null);
    onSubmit({
      summary: summary.trim(), calendarId, dtstart, dtend, allDay,
      description, location, attendees, withTalkRoom, talkRoomType,
      organizerEmail, organizerName, rrule,
    });
  }

  const inputStyle = [styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }];
  const labelStyle = [styles.label, { color: theme.colors.textSecondary }];


  const androidPickerMode = androidStep?.step === 'time' ? 'time' : 'date';
  const androidPickerValue = androidStep?.step === 'time' && androidStep.partial
    ? androidStep.partial
    : androidStep?.target === 'start' ? dtstart : dtend;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
    <ScrollView
      ref={scrollRef}
      style={[styles.scroll, { backgroundColor: theme.colors.background }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="none"
    >
      <View onLayout={(e) => onFieldLayout('title', e)}>
        <Text style={labelStyle}>{t('event.titleLabel')}</Text>
        <TextInput
          style={inputStyle}
          value={summary}
          onChangeText={setSummary}
          placeholder={t('event.titlePlaceholder')}
          placeholderTextColor={theme.colors.textTertiary}
          onFocus={() => scrollToField('title')}
        />
      </View>

      <Text style={labelStyle}>{t('event.calendar')}</Text>
      {writableCalendars.length === 0 && (
        <Text style={[styles.readOnlyNote, { color: theme.colors.warning }]}>
          {t('event.noWritableCalendars')}
        </Text>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {writableCalendars.map((cal) => (
          <TouchableOpacity
            key={cal.id}
            style={[
              styles.calChip,
              { backgroundColor: theme.colors.chip },
              calendarId === cal.id && { backgroundColor: cal.color },
              disableCalendarChange && { opacity: 0.6 },
            ]}
            onPress={() => !disableCalendarChange && setCalendarId(cal.id)}
            disabled={disableCalendarChange}
          >
            <Text style={[
              styles.calChipText,
              { color: theme.colors.textSecondary },
              calendarId === cal.id && { color: '#fff' },
            ]}>
              {cal.displayName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {disableCalendarChange && (
        <Text style={[styles.readOnlyNote, { color: theme.colors.textTertiary, marginTop: 8 }]}>
          {t('event.calendarLockedRecurring')}
        </Text>
      )}

      <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
        <Text style={labelStyle}>{t('event.allDay')}</Text>
        <Switch
          value={allDay}
          onValueChange={setAllDay}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <Text style={labelStyle}>{t('event.start')}</Text>
      <TouchableOpacity style={inputStyle} onPress={openStartPicker}>
        <Text style={{ color: theme.colors.text }}>
          {allDay ? dayjs(dtstart).format('ll') : dayjs(dtstart).format('lll')}
        </Text>
      </TouchableOpacity>


      {Platform.OS === 'ios' && showStartPicker && (
        <DateTimePicker
          value={dtstart}
          mode={allDay ? 'date' : 'datetime'}
          onChange={handleIosStartChange}
        />
      )}

      <Text style={labelStyle}>{t('event.end')}</Text>
      <TouchableOpacity style={inputStyle} onPress={openEndPicker}>
        <Text style={{ color: theme.colors.text }}>
          {allDay ? dayjs(dtend).format('ll') : dayjs(dtend).format('lll')}
        </Text>
      </TouchableOpacity>
      {Platform.OS === 'ios' && showEndPicker && (
        <DateTimePicker
          value={dtend}
          mode={allDay ? 'date' : 'datetime'}
          onChange={handleIosEndChange}
        />
      )}


      {Platform.OS === 'android' && androidStep !== null && (
        <DateTimePicker
          key={`android-picker-${androidStep.target}-${androidStep.step}`}
          value={androidPickerValue ?? new Date()}
          mode={androidPickerMode}
          onChange={handleAndroidChange}
        />
      )}

      <RecurrencePicker value={rrule} onChange={setRrule} />

      <View onLayout={(e) => onFieldLayout('location', e)}>
        <Text style={[labelStyle, { marginTop: 16 }]}>{t('event.location')}</Text>
        <TextInput
          style={inputStyle}
          value={location}
          onChangeText={setLocation}
          placeholder={t('event.locationPlaceholder')}
          placeholderTextColor={theme.colors.textTertiary}
          onFocus={() => scrollToField('location')}
        />
      </View>

      <View onLayout={(e) => onFieldLayout('description', e)}>
        <Text style={labelStyle}>{t('event.description')}</Text>
        <TextInput
          style={[inputStyle, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('event.descriptionPlaceholder')}
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          numberOfLines={3}
          onFocus={() => scrollToField('description')}
        />
      </View>

      <Text style={labelStyle}>{t('event.attendees')}</Text>
      <View onLayout={(e) => onFieldLayout('attendee', e)} style={styles.attendeeRow}>
        <TextInput
          style={[inputStyle, styles.attendeeInput]}
          value={attendeeInput}
          onChangeText={setAttendeeInput}
          placeholder={t('event.attendeePlaceholder')}
          placeholderTextColor={theme.colors.textTertiary}
          autoCapitalize="none"
          keyboardType="email-address"
          onSubmitEditing={addAttendee}
          onFocus={() => scrollToField('attendee')}
          onBlur={() => { attendeeFocused.current = false; }}
        />
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.colors.primary }]} onPress={addAttendee}>
          <Text style={styles.addBtnText}>{t('event.add')}</Text>
        </TouchableOpacity>
      </View>
      {attendees.map((att) => (
        <View key={att.email} style={[styles.attendeeChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.attendeeEmail, { color: theme.colors.primary }]}>{att.email}</Text>
          <TouchableOpacity onPress={() => removeAttendee(att.email)}>
            <Text style={[styles.removeBtn, { color: theme.colors.textTertiary }]}>×</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TalkToggle
        value={withTalkRoom}
        onChange={setWithTalkRoom}
        roomType={talkRoomType}
        onRoomTypeChange={setTalkRoomType}
      />

      {error && <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text>}

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: theme.colors.primary }, loading && styles.saveBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.saveBtnText}>{loading ? t('event.saving') : (submitLabel ?? t('event.saveEvent'))}</Text>
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, padding: 20 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 4, marginTop: 16 },
  input: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 4,
  },
  multiline: { height: 80, textAlignVertical: 'top' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 16, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  readOnlyNote: { fontSize: 13, marginBottom: 8 },
  calChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, marginRight: 8 },
  calChipText: { fontSize: 14 },
  attendeeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  attendeeInput: { flex: 1, marginBottom: 0 },
  addBtn: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '600' },
  attendeeChip: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 6,
  },
  attendeeEmail: { fontSize: 14 },
  removeBtn: { fontSize: 20, lineHeight: 22 },
  error: { fontSize: 14, marginTop: 12 },
  saveBtn: { borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
