import { deleteEvent, moveEvent } from '../../src/api/caldav';
import type { Account, CalendarMeta } from '../../src/types';

const account: Account = {
  id: 'acc-1',
  displayName: 'Work',
  baseUrl: 'https://cloud.example.com',
  username: 'john',
  appPassword: 'xxxx',
  davUserId: 'john',
};

const targetCalendar: CalendarMeta = {
  id: 'cal-work',
  accountId: 'acc-1',
  displayName: 'Work',
  color: '#ff0000',
  ctag: '1',
  url: 'https://cloud.example.com/remote.php/dav/calendars/john/work/',
  slug: 'work',
};

const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('deleteEvent', () => {
  it('sends DELETE to the given href', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204 });
    await deleteEvent(account, 'https://cloud.example.com/remote.php/dav/calendars/john/personal/uid-abc.ics');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://cloud.example.com/remote.php/dav/calendars/john/personal/uid-abc.ics',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('treats 404 as success (already deleted)', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    await expect(
      deleteEvent(account, 'https://cloud.example.com/remote.php/dav/calendars/john/personal/uid-abc.ics')
    ).resolves.toBeUndefined();
  });

  it('throws on other error status', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(
      deleteEvent(account, 'https://cloud.example.com/remote.php/dav/calendars/john/personal/uid-abc.ics')
    ).rejects.toThrow('deleteEvent HTTP 500');
  });
});

describe('moveEvent', () => {
  const fromHref = 'https://cloud.example.com/remote.php/dav/calendars/john/personal/uid-abc.ics';

  it('sends MOVE from the source href to the target collection with Destination + Overwrite', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 201 });
    await moveEvent(account, fromHref, targetCalendar, 'uid-abc');
    expect(mockFetch).toHaveBeenCalledWith(
      fromHref,
      expect.objectContaining({
        method: 'MOVE',
        headers: expect.objectContaining({
          Destination: 'https://cloud.example.com/remote.php/dav/calendars/john/work/uid-abc.ics',
          Overwrite: 'T',
        }),
      })
    );
  });

  it('treats 204 No Content as success', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 204 });
    await expect(moveEvent(account, fromHref, targetCalendar, 'uid-abc')).resolves.toBeUndefined();
  });

  it('throws on error status', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 502, text: () => Promise.resolve('') });
    await expect(moveEvent(account, fromHref, targetCalendar, 'uid-abc')).rejects.toThrow('moveEvent HTTP 502');
  });
});
