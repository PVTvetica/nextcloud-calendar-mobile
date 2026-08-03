import { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import type { RenderEventArgs } from '@super-calendar/native';
import { Typography } from '@/ui/components';

import type { SuperEventExtra } from '../utils/calendar';

const TIME_MIN_MINUTES = 30;

function isLight(hex: string): boolean {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return false;
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.62;
}

function EventCellImpl({ event, isAllDay, onPress }: RenderEventArgs<SuperEventExtra>) {
  const light = isLight(event.color);
  const ink = light ? '#1c1c1e' : '#ffffff';
  const showTime = !isAllDay && dayjs(event.end).diff(event.start, 'minute') >= TIME_MIN_MINUTES;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.cell,
        { backgroundColor: event.color, borderColor: light ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.35)' },
      ]}
    >
      <Typography variant="body2" weight="600" color={ink} style={styles.title} numberOfLines={2}>
        {event.title}
      </Typography>
      {showTime && (
        <Typography color={ink} weight="400" style={styles.time} numberOfLines={1}>
          {dayjs(event.start).format('H:mm')}–{dayjs(event.end).format('H:mm')}
        </Typography>
      )}
    </Pressable>
  );
}

export const EventCell = memo(EventCellImpl);

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  title: { fontSize: 12, lineHeight: 15 },
  time: { fontSize: 10, lineHeight: 13, opacity: 0.8 },
});
