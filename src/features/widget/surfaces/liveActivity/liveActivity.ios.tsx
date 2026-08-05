import React from 'react';
import { HStack, Image, ProgressView, RoundedRectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import { clipShape, font, foregroundStyle, frame, opacity, padding, progressViewStyle, tint } from '@expo/ui/swift-ui/modifiers';
import { after, createLiveActivity, type LiveActivity } from 'expo-widgets';
import dayjs from 'dayjs';

import type { LiveEventState, WidgetSurface } from '../../core/types';
import { writeLiveEvent } from '../../storage/widgetStore';

const ACTIVITY_NAME = 'NextcloudCalendarLiveActivity';

interface ActivityProps {
  title: string;
  timeRange: string;
  startLabel: string;
  location: string;
  color: string;
  startMs: number;
  endMs: number;
}

function toProps(state: LiveEventState): ActivityProps {
  return {
    title: state.title,
    timeRange: `${dayjs(state.startIso).format('LT')} – ${dayjs(state.endIso).format('LT')}`,
    startLabel: dayjs(state.startIso).format('LT'),
    location: state.location,
    color: state.color,
    startMs: new Date(state.startIso).getTime(),
    endMs: new Date(state.endIso).getTime(),
  };
}

const CalendarLiveActivity = (props: ActivityProps) => {
  'widget';

  const TYPE = { time: 12, caption: 13, body: 15, title: 17, heading: 22 };

  function parseHex(hex: string): [number, number, number] {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function toHex(n: number): string {
    const s = Math.max(0, Math.min(255, n)).toString(16);
    return s.length === 1 ? `0${s}` : s;
  }

  function mix(hex: string, target: number, amount: number): string {
    const rgb = parseHex(hex);
    const r = Math.round(rgb[0] + (target - rgb[0]) * amount);
    const g = Math.round(rgb[1] + (target - rgb[1]) * amount);
    const b = Math.round(rgb[2] + (target - rgb[2]) * amount);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  function lighten(hex: string, amount: number): string { return mix(hex, 255, amount); }
  function darken(hex: string, amount: number): string { return mix(hex, 0, amount); }

  function onEventColor(hex: string): string {
    const rgb = parseHex(hex);
    const luminance = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    return luminance > 0.6 ? '#111111' : '#ffffff';
  }

  function CountdownRing({ size, ring }: { size: number; ring: string }) {
    return (
      <ProgressView
        timerInterval={{ lower: new Date(props.startMs), upper: new Date(props.endMs) }}
        countsDown
        modifiers={[progressViewStyle('circular'), tint(ring), frame({ width: size, height: size })]}
      />
    );
  }

  function InfoRow({ symbol, text, fg, size }: { symbol: React.ComponentProps<typeof Image>['systemName']; text: string; fg: string; size: number }) {
    return (
      <HStack modifiers={[padding({ top: 3 })]}>
        <Image systemName={symbol} size={size} modifiers={[foregroundStyle(fg), opacity(0.9), padding({ trailing: 5 })]} />
        <Text modifiers={[font({ size }), foregroundStyle(fg), opacity(0.9)]}>{text}</Text>
      </HStack>
    );
  }

  function Banner() {
    const fg = onEventColor(props.color);
    const bg = {
      type: 'linearGradient' as const,
      colors: [lighten(props.color, 0.12), darken(props.color, 0.28)],
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 1, y: 1 },
    };
    return (
      <ZStack modifiers={[frame({ maxWidth: Infinity }), clipShape('roundedRectangle', 24)]}>
        <RoundedRectangle cornerRadius={24} modifiers={[foregroundStyle(bg), frame({ maxWidth: Infinity, maxHeight: Infinity })]} />
        <Image
          systemName="calendar"
          size={104}
          modifiers={[foregroundStyle(fg), opacity(0.12), frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'trailing' }), padding({ trailing: -3 })]}
        />
        <HStack modifiers={[frame({ maxWidth: Infinity }), padding({ horizontal: 16, vertical: 14 })]}>
          <CountdownRing size={66} ring={fg} />
          <VStack alignment="leading" modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' }), padding({ leading: 14 })]}>
            <Text modifiers={[font({ weight: 'bold', size: TYPE.heading }), foregroundStyle(fg)]}>{props.title}</Text>
            <InfoRow symbol="clock.fill" text={props.timeRange} fg={fg} size={TYPE.caption} />
            {props.location ? <InfoRow symbol="mappin.circle.fill" text={props.location} fg={fg} size={TYPE.caption} /> : null}
          </VStack>
        </HStack>
      </ZStack>
    );
  }

  return {
    banner: <Banner />,
    compactLeading: <CountdownRing size={22} ring={props.color} />,
    compactTrailing: (
      <Text modifiers={[font({ weight: 'semibold', size: TYPE.time }), foregroundStyle(props.color)]}>{props.startLabel}</Text>
    ),
    minimal: <CountdownRing size={18} ring={props.color} />,
    expandedLeading: (
      <HStack modifiers={[padding({ leading: 10, top: 2 })]}>
        <CountdownRing size={52} ring={props.color} />
      </HStack>
    ),
    expandedTrailing: (
      <HStack modifiers={[padding({ trailing: 10, top: 2 })]}>
        <Spacer />
        <Image systemName="calendar" size={22} modifiers={[foregroundStyle(props.color), opacity(0.9)]} />
      </HStack>
    ),
    expandedCenter: (
      <VStack alignment="leading" modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
        <Text modifiers={[font({ weight: 'bold', size: TYPE.title })]}>{props.title}</Text>
      </VStack>
    ),
    expandedBottom: (
      <HStack modifiers={[frame({ maxWidth: Infinity }), padding({ top: 6, bottom: 4, horizontal: 12 })]}>
        <InfoRow symbol="clock.fill" text={props.timeRange} fg={props.color} size={TYPE.caption} />
        <Spacer />
        {props.location ? <InfoRow symbol="mappin.circle.fill" text={props.location} fg={props.color} size={TYPE.caption} /> : null}
      </HStack>
    ),
  };
};

const activity = createLiveActivity<ActivityProps>(ACTIVITY_NAME, CalendarLiveActivity);

let instance: LiveActivity<ActivityProps> | null = null;
let handedOff = false;

function trackedInstance(): LiveActivity<ActivityProps> | null {
  if (!instance) instance = activity.getInstances()[0] ?? null;
  return instance;
}

async function endAll(): Promise<void> {
  await Promise.all(
    activity.getInstances().map((a) => a.end('immediate').catch(() => undefined)),
  );
  instance = null;
  handedOff = false;
}

export const liveActivity: WidgetSurface<LiveEventState> = {
  id: 'liveActivity',
  isSupported: () => typeof activity?.start === 'function',
  update: async (state) => {
    writeLiveEvent(state);
    const props = toProps(state);
    if (handedOff) {
      await endAll();
    } else {
      const current = trackedInstance();
      if (current) {
        try {
          await current.update(props);
          return;
        } catch {
          instance = null;
        }
      }
    }
    try {
      instance = activity.start(props, state.deepLink);
    } catch (error) {
      instance = null;
      throw error;
    }
  },
  clear: async () => {
    writeLiveEvent(null);
    const current = trackedInstance();
    if (!current) {
      handedOff = false;
      return;
    }
    try {
      await current.end('immediate');
    } finally {
      instance = null;
      handedOff = false;
    }
  },
  handOff: async (until) => {
    const current = trackedInstance();
    if (!current || handedOff) return;
    if (until.getTime() - Date.now() > (4 * 3_600_000)) return;
    try {
      await current.end(after(until));
      handedOff = true;
    } catch {
      handedOff = false;
    } finally {
      instance = null;
    }
  },
};
