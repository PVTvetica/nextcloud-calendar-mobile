import { memo } from 'react';
import { StyleSheet } from 'react-native';
import dayjs from 'dayjs';
import type { RenderEventArgs } from '@super-calendar/native';
import { AnimatedPressable, Typography } from '@/ui/components';

import type { SuperEventExtra } from '../utils/calendar';

const TIME_MIN_MINUTES = 30;

const WIDTH_FOR_TIME = 104;
const WIDTH_FOR_WRAP = 84;
const WIDTH_FOR_TEXT = 34;

function isLight(hex: string): boolean {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return false;
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.62;
}

function EventCellImpl({ event, isAllDay, boxWidth, onPress }: RenderEventArgs<SuperEventExtra>) {
  const light = isLight(event.color);
  const ink = light ? '#1c1c1e' : '#ffffff';

  const width = boxWidth ?? Number.POSITIVE_INFINITY;
  const showText = width >= WIDTH_FOR_TEXT;
  const showTime =
    !isAllDay
    && width >= WIDTH_FOR_TIME
    && dayjs(event.end).diff(event.start, 'minute') >= TIME_MIN_MINUTES;

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={0.94}
      opacityTo={0.7}
      style={[
        styles.cell,
        { backgroundColor: event.color, borderColor: light ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.35)' },
      ]}
    >
      {showText && (
        <Typography
          variant="body2"
          weight="600"
          color={ink}
          style={styles.title}
          numberOfLines={width >= WIDTH_FOR_WRAP ? 2 : 1}
          ellipsizeMode="tail"
        >
          {event.title}
        </Typography>
      )}
      {showTime && (
        <Typography color={ink} weight="400" style={styles.time} numberOfLines={1}>
          {dayjs(event.start).format('H:mm')}–{dayjs(event.end).format('H:mm')}
        </Typography>
      )}
    </AnimatedPressable>
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
