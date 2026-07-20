import { useSyncExternalStore } from 'react';
import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';


function isOnline(state: Network.NetworkState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

export function setupOnlineManager(): () => void {
  onlineManager.setEventListener((setOnline) => {
    Network.getNetworkStateAsync()
      .then((state) => setOnline(isOnline(state)))
      .catch(() => undefined);
    const sub = Network.addNetworkStateListener((state) => setOnline(isOnline(state)));
    return () => sub.remove();
  });
  return () => onlineManager.setEventListener(() => () => undefined);
}

export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true,
  );
}
