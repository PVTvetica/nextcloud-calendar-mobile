import { memo } from 'react';
import { TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import dayjs from 'dayjs';
import { Typography } from '@/ui/components';
import type { GridEvent } from '../utils/toGridEvents';

interface Props {
  event: GridEvent;
  top: string;
  height: string;
  leftPct: number;
  widthPct: number;
  zIndex: number;
  hourRowHeight: number;
  dimmed?: boolean;
  onPress: (event: GridEvent) => void;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function contrastFor(hex: string) {
  try {
    const { r, g, b } = hexToRgb(hex);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.62
      ? { text: '#1c1c1e', subtext: 'rgba(0,0,0,0.6)', border: 'rgba(0,0,0,0.14)' }
      : { text: '#ffffff', subtext: 'rgba(255,255,255,0.85)', border: 'rgba(255,255,255,0.35)' };
  } catch {
    return { text: '#ffffff', subtext: 'rgba(255,255,255,0.85)', border: 'rgba(255,255,255,0.35)' };
  }
}

function TimeGridEventImpl({ event, top, height, leftPct, widthPct, zIndex, hourRowHeight, dimmed, onPress }: Props) {
  const scale = Math.min(Math.max((hourRowHeight - 30) / 170, 0), 1);
  const titleSize = Math.round(11 + scale * 4);
  const timeSize = Math.round(9 + scale * 2);
  const pad = Math.round(2 + scale * 4);
  const color = event.color;
  const ink = contrastFor(color);
  const durationMin = dayjs(event.end).diff(event.start, 'minute');

  const positionStyle: ViewStyle = {
    position: 'absolute',
    top: top as ViewStyle['top'],
    height: height as ViewStyle['height'],
    marginTop: 2,
    zIndex,
    left: `${leftPct}%` as ViewStyle['left'],
    width: `${widthPct}%` as ViewStyle['width'],
    paddingLeft: leftPct > 0 ? 2 : 3,
    paddingRight: 3,
    opacity: dimmed ? 0.35 : 1,
  };

  return (
    <TouchableOpacity
      testID={`event-box-${event._event.uid}`}
      onPress={() => onPress(event)}
      style={[positionStyle, styles.card, { backgroundColor: color, borderColor: ink.border, paddingVertical: Math.max(pad - 1, 1) }]}
    >
      {durationMin < 30 ? (
        <Typography variant="body2" weight="600" color={ink.text} style={{ fontSize: titleSize, lineHeight: Math.round(titleSize * 1.25) }} numberOfLines={1}>
          {event.title}
        </Typography>
      ) : (
        <>
          <Typography variant="body2" weight="600" color={ink.text} style={{ fontSize: titleSize, lineHeight: Math.round(titleSize * 1.25) }} numberOfLines={2}>
            {event.title}
          </Typography>
          <Typography color={ink.subtext} weight="400" style={{ fontSize: timeSize, lineHeight: Math.round(timeSize * 1.25) }} numberOfLines={1}>
            {dayjs(event.start).format('H:mm')}–{dayjs(event.end).format('H:mm')}
          </Typography>
        </>
      )}
    </TouchableOpacity>
  );
}

export const TimeGridEvent = memo(TimeGridEventImpl);

const styles = StyleSheet.create({
  card: {
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
