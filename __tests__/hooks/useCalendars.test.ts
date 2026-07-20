import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCalendars } from '../../src/hooks/useCalendars';
import * as caldav from '../../src/services/nextcloud/caldav';
import type { Account, CalendarMeta } from '../../src/types';

jest.mock('../../src/services/nextcloud/caldav');
const mockFetchCalendars = caldav.fetchCalendars as jest.MockedFunction<typeof caldav.fetchCalendars>;

const account: Account = {
  id: 'acc-1', displayName: 'Work', baseUrl: 'https://cloud.example.com',
  username: 'john', appPassword: 'xxxx', davUserId: 'john',
};

const mockCalendar: CalendarMeta = {
  id: 'cal-url', accountId: 'acc-1', displayName: 'Personal',
  color: '#0082c9', ctag: 'abc', url: 'cal-url/', slug: 'personal',
};

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

describe('useCalendars', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns calendars from fetchCalendars', async () => {
    mockFetchCalendars.mockResolvedValue([mockCalendar]);
    const { result } = renderHook(() => useCalendars(account), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].displayName).toBe('Personal');
  });

  it('returns undefined when account is null', () => {
    const { result } = renderHook(() => useCalendars(null), { wrapper });
    expect(result.current.data).toBeUndefined();
    expect(mockFetchCalendars).not.toHaveBeenCalled();
  });
});
