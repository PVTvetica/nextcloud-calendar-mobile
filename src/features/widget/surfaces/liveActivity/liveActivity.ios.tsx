import React from 'react';
import { HStack, Text, VStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivity } from 'expo-widgets';

import type { LiveEventState, WidgetSurface } from '../../core/types';
import { eventProgress, remainingMinutes } from '../../core/liveEvent';
import { onEventColor, widgetRadius, widgetType } from '../../core/theme';
import { writeLiveEvent } from '../../storage/widgetStore';

const ACTIVITY_NAME = 'NextcloudCalendarLiveActivity';

interface ActivityProps {
  title: string;
  timeLabel: string;
  location: string;
  attendees: string;
  color: string;
  progress: number;
}

function toProps(state: LiveEventState, now: Date = new Date()): ActivityProps {
  return {
    title: state.title,
    timeLabel: `${remainingMinutes(state, now)} min`,
    location: state.location,
    attendees: state.attendees.join(', '),
    color: state.color,
    progress: eventProgress(state, now),
  };
}

function Banner(props: ActivityProps) {
  'widget';
  const fg = onEventColor(props.color);
  return (
    <VStack
      modifiers={[
        frame({ maxWidth: Infinity }),
        background(props.color),
        cornerRadius(widgetRadius.lg),
        padding({ all: 14 }),
      ]}
    >
      <HStack modifiers={[frame({ maxWidth: Infinity })]}>
        <Text modifiers={[font({ weight: 'bold', size: widgetType.heading }), foregroundStyle(fg)]}>
          {props.title}
        </Text>
        <Text modifiers={[font({ weight: 'semibold', size: widgetType.body }), foregroundStyle(fg)]}>
          {props.timeLabel}
        </Text>
      </HStack>
      {props.location ? (
        <Text modifiers={[font({ size: widgetType.caption }), foregroundStyle(fg)]}>{props.location}</Text>
      ) : null}
      {props.attendees ? (
        <Text modifiers={[font({ size: widgetType.caption }), foregroundStyle(fg)]}>{props.attendees}</Text>
      ) : null}
    </VStack>
  );
}

const CalendarLiveActivity = (props: ActivityProps) => {
  'widget';
  const fg = onEventColor(props.color);
  return {
    banner: <Banner {...props} />,
    compactLeading: (
      <Text modifiers={[font({ weight: 'semibold', size: widgetType.time })]}>{props.timeLabel}</Text>
    ),
    compactTrailing: <Text modifiers={[font({ size: widgetType.time })]}>{props.title}</Text>,
    minimal: <Text modifiers={[font({ size: widgetType.time })]}>{props.timeLabel}</Text>,
    expandedLeading: (
      <VStack modifiers={[padding({ all: 8 })]}>
        <Text modifiers={[font({ weight: 'bold', size: widgetType.title })]}>{props.title}</Text>
        {props.location ? (
          <Text modifiers={[font({ size: widgetType.caption })]}>{props.location}</Text>
        ) : null}
      </VStack>
    ),
    expandedTrailing: (
      <VStack modifiers={[padding({ all: 8 })]}>
        <Text modifiers={[font({ weight: 'semibold', size: widgetType.body })]}>{props.timeLabel}</Text>
      </VStack>
    ),
    expandedBottom: (
      <VStack modifiers={[frame({ maxWidth: Infinity }), padding({ horizontal: 8 })]}>
        <Text modifiers={[font({ size: widgetType.caption }), foregroundStyle(fg)]}>{props.attendees}</Text>
      </VStack>
    ),
  };
};

const activity = createLiveActivity<ActivityProps>(ACTIVITY_NAME, CalendarLiveActivity);

let instance: LiveActivity<ActivityProps> | null = null;

export const liveActivity: WidgetSurface<LiveEventState> = {
  id: 'liveActivity',
  isSupported: () => typeof activity?.start === 'function',
  update: async (state) => {
    writeLiveEvent(state);
    const props = toProps(state);
    if (instance) instance.update(props);
    else instance = activity.start(props, state.deepLink);
  },
  clear: async () => {
    writeLiveEvent(null);
    if (!instance) return;
    try {
      await instance.end('immediate');
    } finally {
      instance = null;
    }
  },
};
