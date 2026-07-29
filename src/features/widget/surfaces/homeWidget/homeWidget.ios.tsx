import React from 'react';
import { HStack, Link, Text, VStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, font, foregroundStyle, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import * as ExpoWidgets from 'expo-widgets';

import type { AgendaEventItem, AgendaSnapshot, WidgetSurface } from '../../core/types';
import { openAppLink } from '../../core/types';
import { agendaGroups, agendaHeader, agendaPalette, compactEvents, emptyLabel } from '../../core/agendaView';
import { onEventColor, widgetRadius, widgetType, type WidgetPalette } from '../../core/theme';
import { writeAgendaSnapshot } from '../../storage/widgetStore';

const WIDGET_NAME = 'NextcloudCalendarWidget';
const LARGE_BUDGET = 6;
const ACCESSORY_FAMILIES = ['accessoryInline', 'accessoryCircular', 'accessoryRectangular'];

async function reloadTimeline(props: unknown): Promise<void> {
  const api = ExpoWidgets as unknown as Record<string, unknown>;
  const reload = api.reloadWidget ?? api.reloadAllTimelines ?? api.reload ?? api.setWidgetData;
  if (typeof reload === 'function') {
    await (reload as (name: string, props?: unknown) => Promise<void>)(WIDGET_NAME, props);
  }
}

function EventCard({ event }: { event: AgendaEventItem }) {
  'widget';
  const fg = onEventColor(event.color);
  return (
    <Link destination={event.deepLink}>
      <VStack modifiers={[frame({ maxWidth: Infinity }), background(event.color), cornerRadius(widgetRadius.sm), padding({ all: 10 })]}>
        <Text modifiers={[font({ weight: 'medium', size: widgetType.body }), foregroundStyle(fg)]}>{event.title}</Text>
        <Text modifiers={[font({ size: widgetType.time }), foregroundStyle(fg)]}>{event.timeLabel}</Text>
      </VStack>
    </Link>
  );
}

function EmptyState({ snapshot, palette }: { snapshot: AgendaSnapshot | null; palette: WidgetPalette }) {
  'widget';
  return <Text modifiers={[font({ size: widgetType.caption }), foregroundStyle(palette.textTertiary)]}>{emptyLabel(snapshot)}</Text>;
}

function LargeWidget({ snapshot, palette }: { snapshot: AgendaSnapshot | null; palette: WidgetPalette }) {
  'widget';
  const groups = agendaGroups(snapshot, LARGE_BUDGET);
  return (
    <VStack modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity }), background(palette.background), cornerRadius(widgetRadius.lg), padding({ all: 14 })]}>
      {groups.length === 0 ? (
        <EmptyState snapshot={snapshot} palette={palette} />
      ) : (
        groups.map((group) => (
          <VStack key={group.key} modifiers={[frame({ maxWidth: Infinity })]}>
            <Text modifiers={[font({ weight: 'semibold', size: widgetType.caption }), foregroundStyle(group.isToday ? palette.primary : palette.textSecondary)]}>{group.header}</Text>
            {group.items.map((event) => <EventCard key={`${event.uid}-${event.startIso}`} event={event} />)}
          </VStack>
        ))
      )}
    </VStack>
  );
}

function AccessoryWidget({ snapshot, family }: { snapshot: AgendaSnapshot | null; family: string }) {
  'widget';
  const next = snapshot?.nextEvent ?? null;
  if (!next) {
    return <Text modifiers={[font({ size: widgetType.caption })]}>No event</Text>;
  }
  if (family === 'accessoryInline') {
    return <Text modifiers={[font({ size: widgetType.caption })]}>{`${next.timeLabel} ${next.title}`}</Text>;
  }
  if (family === 'accessoryCircular') {
    return (
      <VStack>
        <Text modifiers={[font({ weight: 'semibold', size: widgetType.time })]}>{next.timeLabel}</Text>
      </VStack>
    );
  }
  return (
    <VStack modifiers={[frame({ maxWidth: Infinity })]}>
      <Text modifiers={[font({ weight: 'semibold', size: widgetType.body })]}>{next.title}</Text>
      <Text modifiers={[font({ size: widgetType.caption })]}>{next.timeLabel}</Text>
    </VStack>
  );
}

function CompactWidget({ snapshot, palette, limit }: { snapshot: AgendaSnapshot | null; palette: WidgetPalette; limit: number }) {
  'widget';
  const header = agendaHeader(snapshot);
  const events = compactEvents(snapshot, limit);
  return (
    <HStack modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity }), background(palette.background), cornerRadius(widgetRadius.lg), padding({ all: 14 })]}>
      <VStack modifiers={[frame({ width: 52 })]}>
        <Text modifiers={[font({ weight: 'semibold', size: widgetType.caption }), foregroundStyle(palette.primary)]}>{header.dayLabel}</Text>
        <Text modifiers={[font({ weight: 'bold', size: widgetType.heading }), foregroundStyle(palette.text)]}>{header.dayNumber}</Text>
      </VStack>
      <VStack modifiers={[frame({ maxWidth: Infinity }), padding({ leading: 8 })]}>
        {events.length === 0 ? (
          <EmptyState snapshot={snapshot} palette={palette} />
        ) : (
          events.map((event) => <EventCard key={`${event.uid}-${event.startIso}`} event={event} />)
        )}
      </VStack>
    </HStack>
  );
}

function CalendarWidget(props: { snapshot: AgendaSnapshot | null }, env: WidgetEnvironment) {
  'widget';
  const snapshot = props.snapshot;
  const palette = agendaPalette(snapshot);
  const family = env.widgetFamily;

  if (ACCESSORY_FAMILIES.includes(family)) {
    return <AccessoryWidget snapshot={snapshot} family={family} />;
  }
  if (family === 'systemLarge') {
    return <LargeWidget snapshot={snapshot} palette={palette} />;
  }
  return <CompactWidget snapshot={snapshot} palette={palette} limit={family === 'systemSmall' ? 2 : 3} />;
}

createWidget<{ snapshot: AgendaSnapshot | null }>(WIDGET_NAME, CalendarWidget);

export const homeWidget: WidgetSurface<AgendaSnapshot> = {
  id: 'homeWidget',
  isSupported: () => true,
  update: async (snapshot) => {
    writeAgendaSnapshot(snapshot);
    await reloadTimeline({ snapshot });
  },
  clear: async () => {
    await reloadTimeline({ snapshot: null });
  },
};

export { openAppLink };
