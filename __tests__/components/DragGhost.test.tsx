import React from 'react';
import { render as rtlRender } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ThemeWrapper } from '../helpers/theme';
import { DragGhost } from '@/features/calendar/components/DragGhost';
import type { GridEvent } from '@/features/calendar/utils/toGridEvents';
import type { CalendarEvent } from '@/types';

const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: ThemeWrapper });

const shared = (v: number) => ({ value: v }) as never;

const event: GridEvent = (() => {
  const e: CalendarEvent = {
    uid: 'u1', href: '/u1.ics', calendarId: 'c1', accountId: 'a1',
    summary: 'Standup',
    dtstart: new Date(2026, 7, 7, 9, 0), dtend: new Date(2026, 7, 7, 10, 0),
    allDay: false, color: '#0082c9', attendees: [], isRecurring: false,
  };
  return { title: e.summary, start: e.dtstart, end: e.dtend, color: e.color, _event: e };
})();

function ghost() {
  return (
    <DragGhost
      event={event}
      top={shared(100)}
      height={shared(60)}
      left={shared(0)}
      width={100}
    />
  );
}

describe('DragGhost', () => {
  it('shows the dragged event title', () => {
    expect(render(ghost()).getByText('Standup')).toBeTruthy();
  });

  it('renders no resize handles', () => {
    // The ghost is the event being lifted, not a placeholder with controls.
    const { queryByTestId } = render(ghost());
    expect(queryByTestId('ghost-handle-start')).toBeNull();
    expect(queryByTestId('ghost-handle-end')).toBeNull();
  });

  it('draws no outline, so it reads as the event rather than a frame', () => {
    const flat = StyleSheet.flatten(render(ghost()).getByTestId('drag-ghost').props.style);
    expect(flat.borderWidth ?? 0).toBe(0);
  });

  it('carries the event colour', () => {
    const flat = StyleSheet.flatten(render(ghost()).getByTestId('drag-ghost').props.style);
    expect(flat.backgroundColor).toBe('#0082c9');
  });
});
