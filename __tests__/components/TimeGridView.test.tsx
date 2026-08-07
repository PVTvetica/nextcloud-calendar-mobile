import React from 'react';
import { render as rtlRender } from '@testing-library/react-native';
import { Gesture } from 'react-native-gesture-handler';
import { ThemeWrapper } from '../helpers/theme';
import { TimeGridView } from '@/features/calendar/components/TimeGridView';
import { toGridEvents } from '@/features/calendar/utils/toGridEvents';
import { computeOverlapMap } from '@/features/calendar/utils/overlapMap';
import type { CalendarEvent } from '@/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// The project's Reanimated mock has no useDerivedValue / useAnimatedReaction,
// which InfinitePager needs. Render page 0 only; paging itself is not under test.
jest.mock('react-native-infinite-pager', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef(({ renderPage }: any, _ref: any) =>
      renderPage ? renderPage({ index: 0 }) : null
    ),
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
  const events = over.events ?? toGridEvents([timed], computeOverlapMap([timed]));
  return (
    <TimeGridView
      mode="week"
      anchorDate={anchor}
      activeDate={anchor}
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
        events: toGridEvents([holiday], computeOverlapMap([holiday])),
        allDayEvents: [holiday],
      })
    );
    // Present once: the header chip. The grid excludes allDay events.
    expect(getByText('Public holiday')).toBeTruthy();
  });

  it('highlights the active date', () => {
    const { getByTestId } = render(view({ activeDate: new Date(2026, 7, 5) }));
    expect(getByTestId('day-highlight-2026-08-05')).toBeTruthy();
  });
});
