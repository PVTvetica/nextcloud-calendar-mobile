import { useCallback } from 'react';
import { haptic, ImpactFeedbackStyle } from '@/utils/haptics';

import { useUpdateEvent } from '@/features/event/hooks/useMutateEvent';
import { accountOrganizerEmail, canEditEvent } from '@/features/event/organizer';
import type { Account, CalendarMeta, CreateEventInput } from '@/types';

import type { SuperEvent } from '../utils/calendar';

export function useEventDrag(account: Account | null, calendars: CalendarMeta[]) {
  const updateMutation = useUpdateEvent(account as Account, calendars);

  const onDragStart = useCallback(() => {
    haptic(ImpactFeedbackStyle.Medium);
  }, []);

  const onDragEvent = useCallback((dragged: SuperEvent, start: Date, end: Date) => {
    const event = dragged.source;
    const calendar = calendars.find((c) => c.id === event.calendarId);

    if (!account || !canEditEvent(event, calendar, account)) return false;
    if (event.isRecurring) return false;
    if (event.allDay) return false;

    const input: CreateEventInput = {
      summary: event.summary,
      calendarId: event.calendarId,
      dtstart: start,
      dtend: end,
      allDay: event.allDay,
      description: event.description,
      location: event.location,
      attendees: event.attendees,
      withTalkRoom: false,
      organizerEmail: event.organizerEmail ?? accountOrganizerEmail(account),
      organizerName: account.displayName,
      alarmMinutes: event.alarmMinutes,
    };

    void updateMutation.mutateAsync({ event, input, scope: 'all' });
  }, [account, calendars, updateMutation]);

  return { onDragEvent, onDragStart };
}
