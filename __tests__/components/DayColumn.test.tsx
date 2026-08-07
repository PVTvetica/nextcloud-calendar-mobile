import React from 'react';
import { render as rtlRender, fireEvent } from '@testing-library/react-native';
import { ThemeWrapper } from '../helpers/theme';
import { DayColumn } from '@/features/calendar/components/DayColumn';
import type { GridEvent } from '@/features/calendar/utils/toGridEvents';
import type { CalendarEvent } from '@/types';

const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: ThemeWrapper });

const date = new Date(2026, 7, 7);

function gridEvent(over: Partial<CalendarEvent> = {}): GridEvent {
  const e: CalendarEvent = {
    uid: 'u1', href: '/u1.ics', calendarId: 'c1', accountId: 'a1',
    summary: 'Standup',
    dtstart: new Date(2026, 7, 7, 9, 0), dtend: new Date(2026, 7, 7, 10, 0),
    allDay: false, color: '#0082c9', attendees: [], isRecurring: false,
    ...over,
  };
  return {
    title: e.summary, start: e.dtstart, end: e.dtend, color: e.color,
    _event: e, _leftPct: 0, _rightPx: 3, _zIndex: 100,
  };
}

const now = new Date(2026, 7, 7, 12, 0);

describe('DayColumn', () => {
  it('renders 24 hour cells', () => {
    const { getAllByTestId } = render(
      <DayColumn date={date} events={[]} hourRowHeight={60} now={now} onPressSlot={jest.fn()} onPressEvent={jest.fn()} />
    );
    expect(getAllByTestId(/^hour-cell-/)).toHaveLength(24);
  });

  it('renders its events', () => {
    const { getByText } = render(
      <DayColumn date={date} events={[gridEvent()]} hourRowHeight={60} now={now} onPressSlot={jest.fn()} onPressEvent={jest.fn()} />
    );
    expect(getByText('Standup')).toBeTruthy();
  });

  it('derives the tapped hour from the vertical touch position', () => {
    const onPressSlot = jest.fn();
    const { getByTestId } = render(
      <DayColumn date={date} events={[]} hourRowHeight={60} now={now} onPressSlot={onPressSlot} onPressEvent={jest.fn()} />
    );

    fireEvent.press(getByTestId('day-column-surface'), { nativeEvent: { locationY: 545 } });

    expect(onPressSlot).toHaveBeenCalledTimes(1);
    const tapped: Date = onPressSlot.mock.calls[0][0];
    expect(tapped.getHours()).toBe(9);
    expect(tapped.getMinutes()).toBe(0);
    expect(tapped.getDate()).toBe(7);
  });

  it('clamps a touch past the bottom to the last hour', () => {
    const onPressSlot = jest.fn();
    const { getByTestId } = render(
      <DayColumn date={date} events={[]} hourRowHeight={60} now={now} onPressSlot={onPressSlot} onPressEvent={jest.fn()} />
    );

    fireEvent.press(getByTestId('day-column-surface'), { nativeEvent: { locationY: 99999 } });

    expect(onPressSlot.mock.calls[0][0].getHours()).toBe(23);
  });

  it('reports the pressed event', () => {
    const onPressEvent = jest.fn();
    const event = gridEvent();
    const { getByText } = render(
      <DayColumn date={date} events={[event]} hourRowHeight={60} now={now} onPressSlot={jest.fn()} onPressEvent={onPressEvent} />
    );

    fireEvent.press(getByText('Standup'));

    expect(onPressEvent).toHaveBeenCalledWith(event);
  });

  it('shows the now indicator only on the day matching the now prop', () => {
    const today = render(
      <DayColumn date={date} events={[]} hourRowHeight={60} now={now} onPressSlot={jest.fn()} onPressEvent={jest.fn()} />
    );
    expect(today.queryByTestId('now-indicator')).toBeTruthy();

    const other = render(
      <DayColumn date={new Date(2020, 0, 1)} events={[]} hourRowHeight={60} now={now} onPressSlot={jest.fn()} onPressEvent={jest.fn()} />
    );
    expect(other.queryByTestId('now-indicator')).toBeNull();
  });

  it('advances the now indicator position as the now prop advances, without remounting', () => {
    const early = render(
      <DayColumn date={date} events={[]} hourRowHeight={60} now={new Date(2026, 7, 7, 1, 0)} onPressSlot={jest.fn()} onPressEvent={jest.fn()} />
    );
    const earlyTop = (early.getByTestId('now-indicator').props.style as Array<{ top?: string }>)
      .find((s) => s?.top)?.top;

    early.rerender(
      <DayColumn date={date} events={[]} hourRowHeight={60} now={new Date(2026, 7, 7, 13, 0)} onPressSlot={jest.fn()} onPressEvent={jest.fn()} />
    );
    const laterTop = (early.getByTestId('now-indicator').props.style as Array<{ top?: string }>)
      .find((s) => s?.top)?.top;

    expect(earlyTop).not.toBe(laterTop);
  });
});
