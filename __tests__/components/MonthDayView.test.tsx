import React from 'react';
import { render as rtlRender } from '@testing-library/react-native';
import { ThemeWrapper } from '../helpers/theme';
import dayjs from 'dayjs';

const render = (ui: React.ReactElement, opts?: Parameters<typeof rtlRender>[1]) =>
  rtlRender(ui, { wrapper: ThemeWrapper, ...opts });
import 'dayjs/locale/fr';
import { MonthDayView, buildMonthGrid, eventDayKeys } from '@/features/calendar/components/MonthDayView';
import type { CalendarEvent } from '../../src/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const june10 = new Date(2026, 5, 10);
const june15 = new Date(2026, 5, 15);

const event: CalendarEvent = {
  uid: 'e1', href: '/e1.ics', calendarId: 'c1', accountId: 'a1',
  summary: 'Birthday Party',
  dtstart: new Date(2026, 5, 15, 10, 0), dtend: new Date(2026, 5, 15, 11, 0),
  allDay: false, color: '#0082c9', attendees: [], isRecurring: false,
};

function view(date: Date) {
  return (
    <MonthDayView
      date={date}
      events={[event]}
      weekStartsOn={0}
      onSelectDate={jest.fn()}
      onPressEvent={jest.fn()}
      onPressCell={jest.fn()}
    />
  );
}

describe('buildMonthGrid', () => {
  afterEach(() => {
    dayjs.locale('en');
  });

  function expectColumnsMatchWeekdays(weekStartsOn: 0 | 1) {
    const grid = buildMonthGrid(2026, 5, weekStartsOn);
    for (const week of grid) {
      week.forEach((cell, col) => {
        if (cell === null) return;
        expect(cell.day()).toBe((weekStartsOn + col) % 7);
      });
    }
  }

  it('aligns dates with weekday columns when week starts on Sunday', () => {
    expectColumnsMatchWeekdays(0);
  });

  it('aligns dates with weekday columns when week starts on Monday', () => {
    expectColumnsMatchWeekdays(1);
  });

  it('stays aligned under a Monday-start locale (fr)', () => {
    dayjs.locale('fr');
    expectColumnsMatchWeekdays(0);
    expectColumnsMatchWeekdays(1);
  });

  it('places June 1, 2026 (a Monday) under the Monday column', () => {
    dayjs.locale('fr');
    const isJune1 = (d: dayjs.Dayjs | null) => d !== null && d.date() === 1 && d.month() === 5;
    for (const weekStartsOn of [0, 1] as const) {
      const grid = buildMonthGrid(2026, 5, weekStartsOn);
      const firstRow = grid.find((week) => week.some(isJune1))!;
      const col = firstRow.findIndex(isJune1);
      expect((weekStartsOn + col) % 7).toBe(1);
    }
  });
});

describe('eventDayKeys', () => {
  const make = (over: Partial<CalendarEvent>): CalendarEvent => ({
    uid: 'x', href: '/x.ics', calendarId: 'c1', accountId: 'a1', summary: 'x',
    dtstart: new Date(2026, 5, 15), dtend: new Date(2026, 5, 15),
    allDay: true, color: '#000', attendees: [], isRecurring: false, ...over,
  });

  it('returns one key for a single-day all-day event', () => {
    expect(eventDayKeys(make({ dtstart: new Date(2026, 5, 15), dtend: new Date(2026, 5, 15) })))
      .toEqual(['2026-06-15']);
  });

  it('returns every day across a multi-day all-day span (inclusive end)', () => {
    expect(eventDayKeys(make({ dtstart: new Date(2026, 5, 15), dtend: new Date(2026, 5, 17) })))
      .toEqual(['2026-06-15', '2026-06-16', '2026-06-17']);
  });

  it('spans across a month boundary', () => {
    expect(eventDayKeys(make({ dtstart: new Date(2026, 5, 30), dtend: new Date(2026, 6, 2) })))
      .toEqual(['2026-06-30', '2026-07-01', '2026-07-02']);
  });

  it('returns only the start day for a timed event', () => {
    expect(eventDayKeys(make({
      allDay: false, dtstart: new Date(2026, 5, 15, 9, 0), dtend: new Date(2026, 5, 15, 10, 0),
    }))).toEqual(['2026-06-15']);
  });
});

describe('MonthDayView', () => {
  it('derives the selected day from the date prop and follows prop changes', () => {
    const { getByText, queryByText, rerender } = render(view(june10));

    expect(getByText(dayjs(june10).format('dddd, LL'))).toBeTruthy();
    expect(queryByText('Birthday Party')).toBeNull();

    rerender(view(june15));

    expect(getByText(dayjs(june15).format('dddd, LL'))).toBeTruthy();
    expect(queryByText('Birthday Party')).toBeTruthy();
  });
});

describe('MonthDayView multi-day all-day events', () => {
  const conference: CalendarEvent = {
    uid: 'e2', href: '/e2.ics', calendarId: 'c1', accountId: 'a1',
    summary: 'Conference',
    dtstart: new Date(2026, 5, 15), dtend: new Date(2026, 5, 17),
    allDay: true, color: '#e74c3c', attendees: [], isRecurring: false,
  };

  function allDayView(date: Date) {
    return (
      <MonthDayView
        date={date}
        events={[conference]}
        weekStartsOn={0}
        onSelectDate={jest.fn()}
        onPressEvent={jest.fn()}
        onPressCell={jest.fn()}
      />
    );
  }

  it('lists the event on its start day', () => {
    expect(render(allDayView(new Date(2026, 5, 15))).queryByText('Conference')).toBeTruthy();
  });

  it('lists the event on a middle day it spans', () => {
    expect(render(allDayView(new Date(2026, 5, 16))).queryByText('Conference')).toBeTruthy();
  });

  it('lists the event on its inclusive last day', () => {
    expect(render(allDayView(new Date(2026, 5, 17))).queryByText('Conference')).toBeTruthy();
  });

  it('does not list the event the day before it starts', () => {
    expect(render(allDayView(new Date(2026, 5, 14))).queryByText('Conference')).toBeNull();
  });

  it('does not list the event the day after it ends', () => {
    expect(render(allDayView(new Date(2026, 5, 18))).queryByText('Conference')).toBeNull();
  });
});
