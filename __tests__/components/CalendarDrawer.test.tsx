import React from 'react';
import { Animated } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { CalendarDrawer } from '../../src/components/CalendarDrawer';
import type { Account, CalendarMeta } from '../../src/types';

jest.mock('../../src/hooks/useTheme', () => ({
  useTheme: () => ({
    surface: '#ffffff',
    text: '#111111',
    textSecondary: '#666666',
    textTertiary: '#999999',
    primary: '#0082c9',
    border: '#dddddd',
  }),
}));

jest.mock('../../src/components/AvatarImage', () => ({
  AvatarImage: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

const account: Account = {
  id: 'acc-1',
  displayName: 'Soluce',
  baseUrl: 'https://cloud.example.com',
  username: 'soluce',
  appPassword: 'secret',
  davUserId: 'soluce',
};

const calendars: CalendarMeta[] = [
  {
    id: 'cal-1',
    accountId: 'acc-1',
    displayName: 'Work',
    color: '#4357c7',
    ctag: '1',
    url: 'https://cloud.example.com/cal-1',
    slug: 'work',
  },
  {
    id: 'cal-2',
    accountId: 'acc-1',
    displayName: 'Read only',
    color: '#0f9d58',
    ctag: '2',
    url: 'https://cloud.example.com/cal-2',
    slug: 'readonly',
    isSubscribed: true,
  },
];

function renderDrawer(props: Partial<React.ComponentProps<typeof CalendarDrawer>> = {}) {
  return render(
    <CalendarDrawer
      open
      drawerAnim={new Animated.Value(0)}
      overlayAnim={new Animated.Value(1)}
      insets={{ top: 0 }}
      activeAccount={account}
      calendars={calendars}
      hiddenCalendarIds={[]}
      notifiableCalendarIds={[]}
      toggleCalendarVisibility={jest.fn()}
      toggleCalendarNotification={jest.fn()}
      onClose={jest.fn()}
      onNavigateSettings={jest.fn()}
      {...props}
    />
  );
}

describe('CalendarDrawer notification icon', () => {
  it('renders an active icon for selected visible calendars', () => {
    renderDrawer({ notifiableCalendarIds: ['cal-1'] });
    expect(screen.getAllByText('notifications')).toHaveLength(1);
  });

  it('renders an inactive icon for unselected visible calendars', () => {
    renderDrawer();
    expect(screen.getAllByText('notifications-outline')).toHaveLength(2);
  });

  it('does not toggle notification selection when the calendar is hidden', () => {
    const toggleCalendarNotification = jest.fn();
    renderDrawer({
      hiddenCalendarIds: ['cal-1'],
      notifiableCalendarIds: ['cal-1'],
      toggleCalendarNotification,
    });

    fireEvent.press(screen.getByTestId('calendar-notification-cal-1'));

    expect(toggleCalendarNotification).not.toHaveBeenCalled();
    expect(screen.getAllByText('notifications-outline').length).toBeGreaterThan(0);
  });

  it('toggles notification selection when the calendar is visible', () => {
    const toggleCalendarNotification = jest.fn();
    renderDrawer({ toggleCalendarNotification });

    fireEvent.press(screen.getByTestId('calendar-notification-cal-1'));

    expect(toggleCalendarNotification).toHaveBeenCalledWith('cal-1');
  });
});
