import { render } from '@testing-library/react-native';
import { EventForm } from '../../src/components/EventForm';
import i18n from '../../src/i18n';
import type { CalendarMeta } from '../../src/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const calendars: CalendarMeta[] = [
  {
    id: 'cal-url', accountId: 'acc-1', displayName: 'Personal', color: '#0082c9',
    ctag: '1', url: 'https://cloud.example.com/remote.php/dav/calendars/john/personal/', slug: 'personal',
  },
];

const baseProps = {
  calendars,
  organizerEmail: 'john@example.com',
  organizerName: 'John',
  onSubmit: () => {},
  loading: false,
};

const LOCKED_CAPTION = "Calendar can't be changed for recurring events.";

describe('EventForm calendar picker', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('shows the locked caption when calendar change is disabled (recurring edit)', () => {
    const { getByText } = render(<EventForm {...baseProps} disableCalendarChange />);
    expect(getByText(LOCKED_CAPTION)).toBeTruthy();
  });

  it('does not show the locked caption when calendar change is allowed', () => {
    const { queryByText } = render(<EventForm {...baseProps} />);
    expect(queryByText(LOCKED_CAPTION)).toBeNull();
  });
});
