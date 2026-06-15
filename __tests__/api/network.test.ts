import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { setupOnlineManager } from '../../src/api/network';

jest.mock('expo-network', () => ({
  __esModule: true,
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
  getNetworkStateAsync: jest.fn(() =>
    Promise.resolve({ isConnected: true, isInternetReachable: true }),
  ),
}));

const addNetworkStateListener = Network.addNetworkStateListener as unknown as jest.Mock;

function lastNetworkCallback(): (state: any) => void {
  const calls = addNetworkStateListener.mock.calls;
  return calls[calls.length - 1][0];
}

describe('setupOnlineManager', () => {
  afterEach(() => {
    onlineManager.setEventListener(() => () => undefined);
    onlineManager.setOnline(true);
    addNetworkStateListener.mockClear();
  });

  it('reports online when connected and the internet is reachable', () => {
    setupOnlineManager();
    lastNetworkCallback()({ isConnected: true, isInternetReachable: true });
    expect(onlineManager.isOnline()).toBe(true);
  });

  it('reports offline when not connected', () => {
    setupOnlineManager();
    lastNetworkCallback()({ isConnected: false, isInternetReachable: false });
    expect(onlineManager.isOnline()).toBe(false);
  });

  it('reports offline when connected but the internet is unreachable', () => {
    setupOnlineManager();
    lastNetworkCallback()({ isConnected: true, isInternetReachable: false });
    expect(onlineManager.isOnline()).toBe(false);
  });

  it('treats unknown reachability (undefined) as online to avoid a cold-start flash', () => {
    setupOnlineManager();
    lastNetworkCallback()({ isConnected: true });
    expect(onlineManager.isOnline()).toBe(true);
  });
});
