import React from 'react';
import { render } from '@testing-library/react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { MonthDayView, buildMonthGrid } from '../../src/components/MonthDayView';
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

  // Every non-null cell must sit in the column whose weekday it actually is.
  // Column c represents weekday (weekStartsOn + c) % 7 (0 = Sunday).
  function expectColumnsMatchWeekdays(weekStartsOn: 0 | 1) {
    const grid = buildMonthGrid(2026, 5, weekStartsOn); // June 2026
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

  // Regression: a Monday-start global dayjs locale (fr/de/es/it/ru) used to shift
  // every cell one column left because startOf('week') returned Monday.
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
      expect((weekStartsOn + col) % 7).toBe(1); // 1 = Monday
    }
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
