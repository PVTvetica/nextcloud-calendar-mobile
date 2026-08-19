import { memo } from 'react';
import { View } from 'react-native';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'expo-router';
import { ChevronRight, Lock } from 'lucide-react-native';

import { Item, Typography } from '@/ui/components';

import type { BookingSlotStatus } from '../types';

dayjs.extend(localizedFormat);

interface Props {
  status: BookingSlotStatus;
  language: string;
  onPress: (status: BookingSlotStatus) => void;
}

function BookingSlotRowImpl({ status, language, onPress }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { slot, busy, events } = status;

  const timeLabel =
    `${dayjs(slot.start).locale(language).format('LT')} – ${dayjs(slot.end).locale(language).format('LT')}`;

  const first = events[0];
  const extra = events.length - 1;
  const description = busy
    ? `${first?.summary ?? ''}${extra > 0 ? ` +${extra}` : ''}`
    : t('booking.free');

  return (
    <Item
      onPress={() => onPress(status)}
      leading={
        <View
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            backgroundColor: busy ? (first?.color ?? colors.textTertiary) : 'transparent',
            borderWidth: busy ? 0 : 2,
            borderColor: colors.primary,
          }}
        />
      }
      title={
        <Typography variant="body1" color={busy ? 'secondary' : 'text'}>
          {timeLabel}
        </Typography>
      }
      description={
        <Typography variant="caption" color="secondary" numberOfLines={1} ellipsizeMode="tail">
          {description}
        </Typography>
      }
      trailing={
        busy
          ? <ChevronRight size={20} color={colors.textTertiary} />
          : <Lock size={18} color={colors.textTertiary} />
      }
    />
  );
}

export const BookingSlotRow = memo(BookingSlotRowImpl);
