import React from 'react';
import { StyleSheet } from 'react-native';
import { render as rtlRender } from '@testing-library/react-native';
import { Gesture } from 'react-native-gesture-handler';
import { ThemeWrapper } from '../helpers/theme';
import { TimeGridView } from '@/features/calendar/components/TimeGridView';
import { toGridEvents } from '@/features/calendar/utils/toGridEvents';
import {
  ALL_DAY_PAD,
  ALL_DAY_ROW_HEIGHT,
  DAY_HEADER_HEIGHT,
  dayKey,
  pageFocusDate,
} from '@/features/calendar/utils/grid';
import type { CalendarEvent } from '@/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Captures every prop bag the two InfinitePager instances (header + grid) are
// rendered with, so tests can reach the grid pager's onPageChange (finding 4a)
// without exercising the real paging engine.
let mockCapturedPagerProps: any[] = [];

// The project's Reanimated mock has no useDerivedValue / useAnimatedReaction,
// which InfinitePager needs. Render page 0 only; paging itself is not under test.
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

const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: ThemeWrapper });

const anchor = new Date(2026, 7, 7); // Friday

const timed: CalendarEvent = {
  uid: 'e1', href: '/e1.ics', calendarId: 'c1', accountId: 'a1',
  summary: 'Standup',
  dtstart: new Date(2026, 7, 7, 9, 0), dtend: new Date(2026, 7, 7, 9, 30),
  allDay: false, color: '#0082c9', attendees: [], isRecurring: false,
};

const holiday: CalendarEvent = {
  ...timed,
  uid: 'e2', summary: 'Public holiday',
  dtstart: new Date(2026, 7, 7), dtend: new Date(2026, 7, 7), allDay: true,
};

function view(over: Partial<React.ComponentProps<typeof TimeGridView>> = {}) {
  const events = over.events ?? toGridEvents([timed]);
  return (
    <TimeGridView
      mode="week"
      anchorDate={anchor}
      activeDate={anchor}
      jump={{ nonce: 0, target: anchor }}
      events={events}
      allDayEvents={[]}
      hourRowHeight={60}
      weekStartsOn={1}
      pinchGesture={Gesture.Pinch()}
      initialScrollHour={8}
      onPageChange={jest.fn()}
      onPressSlot={jest.fn()}
      onPressEvent={jest.fn()}
      onPressAllDayEvent={jest.fn()}
      {...over}
    />
  );
}

describe('TimeGridView', () => {
  beforeEach(() => {
    mockCapturedPagerProps = [];
  });

  it('renders the 24 hour labels exactly once, outside the pager', () => {
    const { getAllByText } = render(view());
    expect(getAllByText('9:00')).toHaveLength(1);
    expect(getAllByText('23:00')).toHaveLength(1);
  });

  it('renders seven day columns in week mode', () => {
    const { getAllByTestId } = render(view());
    expect(getAllByTestId('day-column-surface')).toHaveLength(7);
  });

  it('renders three day columns in 3days mode', () => {
    const { getAllByTestId } = render(view({ mode: '3days' }));
    expect(getAllByTestId('day-column-surface')).toHaveLength(3);
  });

  it('renders one day column in day mode', () => {
    const { getAllByTestId } = render(view({ mode: 'day' }));
    expect(getAllByTestId('day-column-surface')).toHaveLength(1);
  });

  it('places a timed event in the grid', () => {
    const { getByText } = render(view());
    expect(getByText('Standup')).toBeTruthy();
  });

  it('puts an all-day event in the header and not in the grid', () => {
    const { getByText } = render(
      view({
        events: toGridEvents([holiday]),
        allDayEvents: [holiday],
      })
    );
    // Present once: the header chip. The grid excludes allDay events.
    expect(getByText('Public holiday')).toBeTruthy();
  });

  it('highlights today, and no day at all on a page without it', () => {
    const today = new Date();
    const todayKey = `day-highlight-${dayKey(today)}`;

    const onToday = render(view({ anchorDate: today, activeDate: today }));
    expect(onToday.getByTestId(todayKey)).toBeTruthy();

    // A week that cannot contain today: nothing in it is marked, and in
    // particular the pill does not fall back onto the page's first day.
    const past = new Date(2020, 0, 8); // Wednesday
    const elsewhere = render(view({ anchorDate: past, activeDate: past }));
    expect(elsewhere.queryByTestId(todayKey)).toBeNull();
    expect(elsewhere.queryByTestId('day-highlight-2020-01-06')).toBeNull();
    expect(elsewhere.queryByTestId('day-highlight-2020-01-08')).toBeNull();
  });

  // Regression test for the datesForIndex cache (see TimeGridView.tsx): pages are
  // cached by index and must be invalidated when anchorDate/mode/weekStartsOn
  // change. The pager mock always renders index 0, so a stale cache would keep
  // showing dayA's highlight after rerendering with dayB — this would only fail
  // if the cache leaked across the anchorDate change.
  it('drops the stale page cache and shows the new dates after an anchorDate change', () => {
    const dayA = new Date(2026, 7, 7);
    const dayB = new Date(2026, 7, 21);
    // The rendered day number is the observable here: the highlight pill only
    // ever marks today, so it cannot witness which page is on screen.
    const { getByText, queryByText, rerender } = render(
      view({ mode: 'day', anchorDate: dayA, activeDate: dayA })
    );
    expect(getByText('7')).toBeTruthy();

    rerender(view({ mode: 'day', anchorDate: dayB, activeDate: dayB }));

    expect(queryByText('7')).toBeNull();
    expect(getByText('21')).toBeTruthy();
  });

  // Finding 1: headerHeight must track the page the user is actually looking
  // at (activeDate), not datesForIndex(0), which is page 0 relative to
  // anchorDate and stays frozen on swipe (onPageChange deliberately leaves
  // anchorDate alone — see useCalendarNavigation).
  it('sizes the header row for the visible page, not the anchor page', () => {
    const anchorDate = new Date(2026, 7, 7); // Friday, no all-day events on this week
    const activeDate = new Date(2026, 7, 21); // a different week, with two stacked all-day events
    const allDay1: CalendarEvent = { ...holiday, uid: 'h1', dtstart: activeDate, dtend: activeDate };
    const allDay2: CalendarEvent = { ...holiday, uid: 'h2', dtstart: activeDate, dtend: activeDate };

    const { getByTestId } = render(
      view({ mode: 'week', weekStartsOn: 1, anchorDate, activeDate, allDayEvents: [allDay1, allDay2] })
    );

    const flat = StyleSheet.flatten(getByTestId('time-grid-header-row').props.style);
    expect(flat.height).toBe(DAY_HEADER_HEIGHT + 2 * ALL_DAY_ROW_HEIGHT + ALL_DAY_PAD);
  });

  // Finding 4a: exercise the real index → focus date wiring (pageFocusDate),
  // rather than the paging engine, by capturing the grid pager's onPageChange.
  it('wires the pager index through pageFocusDate to onPageChange', () => {
    const onPageChange = jest.fn();
    const anchorDate = new Date(2026, 7, 7);

    render(view({ mode: 'week', weekStartsOn: 1, anchorDate, activeDate: anchorDate, onPageChange }));

    const gridPagerProps = mockCapturedPagerProps.find((p) => typeof p.onPageChange === 'function');
    expect(gridPagerProps).toBeDefined();

    for (const index of [1, -1, 2, -2]) {
      gridPagerProps.onPageChange(index);
      expect(onPageChange).toHaveBeenLastCalledWith(pageFocusDate(anchorDate, index, 'week', 1));
    }
  });
});
