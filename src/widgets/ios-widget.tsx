import React from 'react';
import { HStack, Link, Text, VStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { WidgetDaySnapshot, WidgetEventItem } from './model';

const OPEN_APP = 'nextcloud-calendar:///';

function timeText(event: WidgetEventItem) {
  if (event.allDay) return 'All day';
  const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  return `${new Date(event.startIso).toLocaleTimeString([], options)} - ${new Date(event.endIso).toLocaleTimeString([], options)}`;
}

function EventCard({ event }: { event: WidgetEventItem }) {
  'widget';
  return (
    <Link destination={event.deepLink}>
      <VStack
        modifiers={[
          frame({ maxWidth: 'infinity' }),
          background(event.color),
          cornerRadius(16),
          padding({ all: 10 }),
        ]}
      >
        <Text modifiers={[font({ weight: 'bold', size: 15 }), foregroundStyle('#ffffff')]}>{event.title}</Text>
        <Text modifiers={[font({ size: 13 }), foregroundStyle('#ffffff')]}>{timeText(event)}</Text>
      </VStack>
    </Link>
  );
}

function CalendarWidget(props: { day: WidgetDaySnapshot | null }, environment: WidgetEnvironment) {
  'widget';
  const maxEvents = environment.widgetFamily === 'systemSmall' ? 1 : 3;
  const day = props.day;
  const events = day?.events.slice(0, maxEvents) ?? [];
  const content = (
    <HStack
      modifiers={[
        frame({ maxWidth: 'infinity', maxHeight: 'infinity' }),
        background('#f8fafc'),
        cornerRadius(28),
        padding({ all: 14 }),
      ]}
    >
      <VStack modifiers={[frame({ width: 56 })]}>
        <Text modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle('#5f6368')]}>{day?.dayLabel ?? 'CAL'}</Text>
        <Text modifiers={[font({ size: 38 }), foregroundStyle('#202124')]}>{day?.dayNumber ?? '--'}</Text>
      </VStack>
      <VStack modifiers={[frame({ maxWidth: 'infinity' })]}>
        <Text modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle('#5f6368')]}>{day?.relativeLabel ?? 'No upcoming event'}</Text>
        {events.map((event) => (
          <EventCard key={`${event.uid}-${event.startIso}`} event={event} />
        ))}
      </VStack>
    </HStack>
  );

  return events.length === 0 ? <Link destination={OPEN_APP}>{content}</Link> : content;
}

export default createWidget<{ day: WidgetDaySnapshot | null }>('NextcloudCalendarWidget', CalendarWidget);
