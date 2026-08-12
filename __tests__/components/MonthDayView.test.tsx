import React from 'react';
import { render as rtlRender, fireEvent } from '@testing-library/react-native';
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

let mockCapturedPagerProps: any[] = [];

// Render the pager's current page directly; the real pager pulls Reanimated
// hooks the jest mock does not provide.
jest.mock('react-native-infinite-pager', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((props: any, _ref: any) => {
      mockCapturedPagerProps.push(props);
      return props.renderPage ? props.renderPage({ index: 0 }) : null;
    }),
  };
});

const june10 = new Date(2026, 5, 10);

const event: CalendarEvent = {
  uid: 'e1', href: '/e1.ics', calendarId: 'c1', accountId: 'a1',
  summary: 'Birthday Party',
  dtstart: new Date(2026, 5, 15, 10, 0), dtend: new Date(2026, 5, 15, 11, 0),
  allDay: false, color: '#0082c9', attendees: [], isRecurring: false,
};

function view(date: Date, events: CalendarEvent[] = [event], onPressDay = jest.fn()) {
  return (
    <MonthDayView
      date={date}
      events={events}
      weekStartsOn={0}
      jump={{ nonce: 0, target: date }}
      onPressDay={onPressDay}
      onMonthChange={jest.fn()}
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

  it('returns only the start day for a timed event inside one day', () => {
    expect(eventDayKeys(make({
      allDay: false, dtstart: new Date(2026, 5, 15, 9, 0), dtend: new Date(2026, 5, 15, 10, 0),
    }))).toEqual(['2026-06-15']);
  });

  it('spans a timed event that runs past midnight', () => {
    expect(eventDayKeys(make({
      allDay: false, dtstart: new Date(2026, 5, 15, 22, 0), dtend: new Date(2026, 5, 16, 9, 0),
    }))).toEqual(['2026-06-15', '2026-06-16']);
  });

  it('stops on the start day when a timed event ends exactly at midnight', () => {
    expect(eventDayKeys(make({
      allDay: false, dtstart: new Date(2026, 5, 15, 22, 0), dtend: new Date(2026, 5, 16, 0, 0),
    }))).toEqual(['2026-06-15']);
  });

  it('spans a timed event running over several nights', () => {
    expect(eventDayKeys(make({
      allDay: false, dtstart: new Date(2026, 5, 30, 20, 0), dtend: new Date(2026, 6, 2, 6, 0),
    }))).toEqual(['2026-06-30', '2026-07-01', '2026-07-02']);
  });
});

describe('MonthDayView', () => {
  it('renders an event as a title chip inside the month grid', () => {
    // The chip is part of the grid cell, visible regardless of which day is
    // currently focused.
    const { queryByText } = render(view(june10));
    expect(queryByText('Birthday Party')).toBeTruthy();
  });

  it('does not render chips for events outside the shown month', () => {
    const { queryByText } = render(view(new Date(2026, 6, 18)));
    expect(queryByText('Birthday Party')).toBeNull();
  });

  it('reports a tapped day through onPressDay', () => {
    const onPressDay = jest.fn();
    const { getByText } = render(view(june10, [event], onPressDay));

    fireEvent.press(getByText('15'));

    expect(onPressDay).toHaveBeenCalledTimes(1);
    expect(dayjs(onPressDay.mock.calls[0][0]).format('YYYY-MM-DD')).toBe('2026-06-15');
  });

  it('shows at least four events per day without an overflow marker', () => {
    // Fallback capacity (no measured layout under jest) is 4 slots: four
    // events fit exactly, no "+N".
    const four = ['One', 'Two', 'Three', 'Four'].map((summary, i): CalendarEvent => ({
      ...event, uid: `m${i}`, summary,
      dtstart: new Date(2026, 5, 15, 9 + i, 0), dtend: new Date(2026, 5, 15, 10 + i, 0),
    }));
    const { queryByText } = render(view(june10, four));

    for (const s of ['One', 'Two', 'Three', 'Four']) expect(queryByText(s)).toBeTruthy();
    expect(queryByText(/^\+\d+$/)).toBeNull();
  });

  it('collapses events beyond the cell capacity into a +N marker', () => {
    // Six events at 4 fallback slots: the last slot becomes the overflow
    // marker, so 3 chips + "+3".
    const many = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'].map((summary, i): CalendarEvent => ({
      ...event, uid: `m${i}`, summary,
      dtstart: new Date(2026, 5, 15, 9 + i, 0), dtend: new Date(2026, 5, 15, 10 + i, 0),
    }));
    const { queryByText } = render(view(june10, many));

    expect(queryByText('One')).toBeTruthy();
    expect(queryByText('Two')).toBeTruthy();
    expect(queryByText('Three')).toBeTruthy();
    expect(queryByText('Four')).toBeNull();
    expect(queryByText('Five')).toBeNull();
    expect(queryByText('Six')).toBeNull();
    expect(queryByText('+3')).toBeTruthy();
  });

  it('sorts all-day chips before timed chips on the same day', () => {
    const allDay: CalendarEvent = {
      ...event, uid: 'ad1', summary: 'All Day',
      dtstart: new Date(2026, 5, 15), dtend: new Date(2026, 5, 15), allDay: true,
    };
    // Passed in timed-first order; the all-day chip must still render first.
    const { getAllByText } = render(view(june10, [event, allDay]));

    const labels = getAllByText(/^(All Day|Birthday Party)$/).map((n) => n.props.children);
    expect(labels).toEqual(['All Day', 'Birthday Party']);
  });

  it('reports the first day of the paged-to month through onMonthChange', () => {
    mockCapturedPagerProps = [];
    const onMonthChange = jest.fn();
    render(
      <MonthDayView
        date={june10}
        events={[event]}
        weekStartsOn={0}
        jump={{ nonce: 0, target: june10 }}
        onPressDay={jest.fn()}
        onMonthChange={onMonthChange}
        onPressCell={jest.fn()}
      />
    );

    const pager = mockCapturedPagerProps.find((p) => typeof p.onPageChange === 'function');

    // The pager echoes the current page (0) on mount; that is not a swipe and
    // must not report a month change (which would setState into the parent's
    // render and snap the selection to the 1st).
    pager.onPageChange(0);
    expect(onMonthChange).not.toHaveBeenCalled();

    pager.onPageChange(1);
    expect(onMonthChange).toHaveBeenCalledTimes(1);
    expect(dayjs(onMonthChange.mock.calls[0][0]).format('YYYY-MM-DD')).toBe('2026-07-01');

    pager.onPageChange(-2);
    expect(dayjs(onMonthChange.mock.calls[1][0]).format('YYYY-MM-DD')).toBe('2026-04-01');
  });
});

describe('MonthDayView multi-day all-day events', () => {
  const conference: CalendarEvent = {
    uid: 'e2', href: '/e2.ics', calendarId: 'c1', accountId: 'a1',
    summary: 'Conference',
    dtstart: new Date(2026, 5, 15), dtend: new Date(2026, 5, 17),
    allDay: true, color: '#e74c3c', attendees: [], isRecurring: false,
  };

  it('shows one chip per covered day (start, middle, inclusive end)', () => {
    const { getAllByText } = render(view(june10, [conference]));
    expect(getAllByText('Conference')).toHaveLength(3);
  });

  it('shows no chip in a month the event does not touch', () => {
    const { queryByText } = render(view(new Date(2026, 6, 18), [conference]));
    expect(queryByText('Conference')).toBeNull();
  });
});
