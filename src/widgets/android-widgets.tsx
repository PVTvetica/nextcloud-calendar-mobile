'use no memo';

import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { readWidgetSnapshot } from './WidgetBridge';
import type { WidgetDaySnapshot, WidgetEventItem, WidgetSnapshot } from './model';

const OPEN_APP = 'nextcloud-calendar:///';

function timeText(event: WidgetEventItem) {
  if (event.allDay) return 'All day';
  const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  return `${new Date(event.startIso).toLocaleTimeString([], options)} - ${new Date(event.endIso).toLocaleTimeString([], options)}`;
}

function EventCard({ event }: { event: WidgetEventItem }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: event.deepLink }}
      style={{
        backgroundColor: event.color,
        borderRadius: 16,
        padding: 10,
        marginBottom: 6,
        alignSelf: 'stretch',
      }}
    >
      <TextWidget text={event.title} style={{ color: '#ffffff', fontSize: 15, fontWeight: '700' }} />
      <TextWidget text={timeText(event)} style={{ color: '#ffffff', fontSize: 13, marginTop: 2 }} />
    </FlexWidget>
  );
}

function CalendarWidget({ day, maxEvents }: { day: WidgetDaySnapshot | null; maxEvents: 1 | 3 }) {
  const events = day?.events.slice(0, maxEvents) ?? [];
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: day?.events[0]?.deepLink ?? OPEN_APP }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        borderRadius: 28,
        padding: 14,
      }}
    >
      <FlexWidget style={{ width: 56, marginRight: 8 }}>
        <TextWidget text={day?.dayLabel ?? 'CAL'} style={{ color: '#5f6368', fontSize: 13, fontWeight: '700' }} />
        <TextWidget text={day?.dayNumber ?? '--'} style={{ color: '#202124', fontSize: 38, fontWeight: '400' }} />
      </FlexWidget>
      <FlexWidget style={{ flex: 1, justifyContent: 'flex-start' }}>
        <TextWidget
          text={day?.relativeLabel ?? 'No upcoming event'}
          style={{ color: '#5f6368', fontSize: 13, fontWeight: '700', marginBottom: 4 }}
        />
        {events.map((event) => (
          <EventCard key={`${event.uid}-${event.startIso}`} event={event} />
        ))}
      </FlexWidget>
    </FlexWidget>
  );
}

export function renderAndroidWidget(widgetName: string, snapshot: WidgetSnapshot | null) {
  if (widgetName === 'CalendarSmallWidget') {
    return <CalendarWidget day={snapshot?.small ?? null} maxEvents={1} />;
  }
  return <CalendarWidget day={snapshot?.medium ?? null} maxEvents={3} />;
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (!['WIDGET_ADDED', 'WIDGET_UPDATE', 'WIDGET_RESIZED'].includes(props.widgetAction)) return;

  const snapshot = await readWidgetSnapshot();
  props.renderWidget(renderAndroidWidget(props.widgetInfo.widgetName, snapshot));
}
