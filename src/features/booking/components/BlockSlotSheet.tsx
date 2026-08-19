import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { useTranslation } from 'react-i18next';

import { useSettingsStore } from '@/stores/settingsStore';
import { Button, Chip, Sheet, Stack, TextField, Typography } from '@/ui/components';

import { BLOCK_REASON_IDS, type BlockReasonId } from '../constants';
import type { BookingSlot } from '../types';
import { resolveBlockSummary } from '../utils/blockEvent';

dayjs.extend(localizedFormat);

interface Props {
  slot: BookingSlot | null;
  busy: boolean;
  calendarName?: string;
  onClose: () => void;
  onConfirm: (summary: string) => void;
}

export function BlockSlotSheet({ slot, busy, calendarName, onClose, onConfirm }: Props) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const [reason, setReason] = useState<BlockReasonId>('sport');
  const [customTitle, setCustomTitle] = useState('');

  // Every slot starts from a clean sheet, otherwise the previous reason would
  // silently carry over into the next block.
  useEffect(() => {
    if (slot) {
      setReason('sport');
      setCustomTitle('');
    }
  }, [slot?.key]);

  const summary = slot
    ? resolveBlockSummary({
        reason,
        customTitle,
        presetLabel: t(`booking.reasons.${reason}`),
      })
    : null;

  const when = slot
    ? `${dayjs(slot.start).locale(language).format('dddd, LL')} · ${dayjs(slot.start).locale(language).format('LT')} – ${dayjs(slot.end).locale(language).format('LT')}`
    : '';

  return (
    <Sheet visible={slot !== null} onClose={onClose} title={t('booking.blockTitle')}>
      <Stack gap={16} hAlign="stretch">
        <Typography variant="caption" color="secondary">{when}</Typography>

        <Stack gap={8} hAlign="stretch">
          <Typography variant="body2">{t('booking.reasonLabel')}</Typography>
          <Stack direction="horizontal" gap={8} style={styles.wrap}>
            {BLOCK_REASON_IDS.map((id) => (
              <Chip key={id} active={reason === id} onPress={() => setReason(id)}>
                {t(`booking.reasons.${id}`)}
              </Chip>
            ))}
          </Stack>
        </Stack>

        {reason === 'custom' && (
          <TextField
            label={t('booking.customLabel')}
            value={customTitle}
            onChangeText={setCustomTitle}
            placeholder={t('booking.customPlaceholder')}
            autoFocus
            returnKeyType="done"
          />
        )}

        {calendarName && (
          <Typography variant="caption" color="secondary">
            {t('booking.targetCalendar', { name: calendarName })}
          </Typography>
        )}

        <Button
          variant="primary"
          title={t('booking.blockConfirm')}
          loading={busy}
          disabled={summary === null || busy}
          onPress={() => summary && onConfirm(summary)}
        />
      </Stack>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { flexWrap: 'wrap' },
});
