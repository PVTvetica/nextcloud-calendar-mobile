import { useSyncExternalStore } from 'react';
import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';

/**
 * isInternetReachable is undefined until the first probe resolves — treat
 * unknown as online so we don't flash "offline" on a cold start.
 */
function isOnline(state: Network.NetworkState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

/**
 * Bridge Expo connectivity (expo-network) into TanStack Query's onlineManager.
 *
 * Without this, onlineManager falls back to `navigator.onLine`, which RN does not
 * implement reliably — so refetch-on-reconnect and paused-retry-while-offline
 * never fire. With it wired:
 *   - going offline pauses event-query retries instead of burning them, and
 *   - coming back online auto-resumes them, so events that errored out on a weak
 *     connection reappear on their own.
 *
 * Call once at app startup. Returns the onlineManager teardown.
 */
export function setupOnlineManager(): () => void {
  onlineManager.setEventListener((setOnline) => {
    // addNetworkStateListener fires only on change, so seed the current state.
    Network.getNetworkStateAsync()
      .then((state) => setOnline(isOnline(state)))
      .catch(() => undefined);
    const sub = Network.addNetworkStateListener((state) => setOnline(isOnline(state)));
    return () => sub.remove();
  });
  return () => onlineManager.setEventListener(() => () => undefined);
}

/** Subscribe a component to online/offline transitions. */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true,
  );
}
