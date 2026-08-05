import type { LiveEventState } from '@/features/widget/core/types';

jest.mock('@expo/ui/swift-ui', () => ({ HStack: 'HStack', Text: 'Text', VStack: 'VStack' }));
jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  background: jest.fn(),
  cornerRadius: jest.fn(),
  font: jest.fn(),
  foregroundStyle: jest.fn(),
  frame: jest.fn(),
  padding: jest.fn(),
}));
jest.mock('@/utils/i18n', () => ({ t: (key: string) => key }));
jest.mock('@/features/widget/storage/widgetStore', () => ({ writeLiveEvent: jest.fn() }));

const mockStart = jest.fn();
const mockGetInstances = jest.fn();

jest.mock('expo-widgets', () => ({
  createLiveActivity: () => ({ start: mockStart, getInstances: mockGetInstances }),
  after: (date: Date) => ({ after: date }),
}));

function makeState(overrides: Partial<LiveEventState> = {}): LiveEventState {
  return {
    uid: 'evt-1',
    title: 'Standup',
    startIso: '2026-07-29T09:00:00.000Z',
    endIso: '2026-07-29T09:30:00.000Z',
    color: '#3b82f6',
    deepLink: 'nextcloud-calendar://event/evt-1',
    location: '',
    attendees: [],
    ...overrides,
  };
}

describe('liveActivity (ios)', () => {
  beforeEach(() => {
    jest.resetModules();
    mockStart.mockReset();
    mockGetInstances.mockReset();
  });

  it('starts a new activity when none is tracked and none exist natively', async () => {
    mockGetInstances.mockReturnValue([]);
    const created = { update: jest.fn(), end: jest.fn() };
    mockStart.mockReturnValue(created);

    const { liveActivity } = require('@/features/widget/surfaces/liveActivity/liveActivity.ios');
    await liveActivity.update(makeState());

    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(created.update).not.toHaveBeenCalled();
  });

  it('reuses the native activity found via getInstances() after a JS reload wiped the local reference', async () => {
    const existing = { update: jest.fn().mockResolvedValue(undefined), end: jest.fn() };
    mockGetInstances.mockReturnValue([existing]);

    const { liveActivity } = require('@/features/widget/surfaces/liveActivity/liveActivity.ios');
    await liveActivity.update(makeState({ title: 'Updated title' }));

    expect(mockStart).not.toHaveBeenCalled();
    expect(existing.update).toHaveBeenCalledTimes(1);
    expect(existing.update.mock.calls[0][0]).toMatchObject({ title: 'Updated title' });
  });

  it('falls back to starting a fresh activity when the tracked one was ended externally', async () => {
    const dead = { update: jest.fn().mockRejectedValue(new Error("Can't find live activity with id: x")), end: jest.fn() };
    mockGetInstances.mockReturnValue([dead]);
    const fresh = { update: jest.fn(), end: jest.fn() };
    mockStart.mockReturnValue(fresh);

    const { liveActivity } = require('@/features/widget/surfaces/liveActivity/liveActivity.ios');
    await liveActivity.update(makeState());
    await liveActivity.update(makeState({ title: 'Second edit' }));

    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(fresh.update).toHaveBeenCalledTimes(1);
  });

  it('clear() ends a native activity reconciled via getInstances() even with no local reference', async () => {
    const existing = { update: jest.fn(), end: jest.fn().mockResolvedValue(undefined) };
    mockGetInstances.mockReturnValue([existing]);

    const { liveActivity } = require('@/features/widget/surfaces/liveActivity/liveActivity.ios');
    await liveActivity.clear();

    expect(existing.end).toHaveBeenCalledWith('immediate');
  });

  it('handOff() ends the activity with a deferred dismissal at the event end', async () => {
    const existing = { update: jest.fn(), end: jest.fn().mockResolvedValue(undefined) };
    mockGetInstances.mockReturnValue([existing]);
    const until = new Date(Date.now() + 30 * 60_000);

    const { liveActivity } = require('@/features/widget/surfaces/liveActivity/liveActivity.ios');
    await liveActivity.handOff(until);

    expect(existing.end).toHaveBeenCalledWith({ after: until });
  });

  it('handOff() leaves the activity live when the event ends beyond the four-hour dismissal window', async () => {
    const existing = { update: jest.fn(), end: jest.fn().mockResolvedValue(undefined) };
    mockGetInstances.mockReturnValue([existing]);

    const { liveActivity } = require('@/features/widget/surfaces/liveActivity/liveActivity.ios');
    await liveActivity.handOff(new Date(Date.now() + 5 * 3_600_000));

    expect(existing.end).not.toHaveBeenCalled();
  });

  it('starts a fresh activity after a handOff instead of updating the dismissed one', async () => {
    const handedOff = { update: jest.fn(), end: jest.fn().mockResolvedValue(undefined) };
    mockGetInstances.mockReturnValue([handedOff]);
    const fresh = { update: jest.fn(), end: jest.fn() };
    mockStart.mockReturnValue(fresh);

    const { liveActivity } = require('@/features/widget/surfaces/liveActivity/liveActivity.ios');
    await liveActivity.handOff(new Date(Date.now() + 10 * 60_000));
    await liveActivity.update(makeState());

    expect(handedOff.end).toHaveBeenLastCalledWith('immediate');
    expect(handedOff.update).not.toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalledTimes(1);
  });
});
