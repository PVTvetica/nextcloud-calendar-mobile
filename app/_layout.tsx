import { focusManager } from '@tanstack/react-query';
import { Stack, useRouter, useTheme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { loadAccounts, getActiveAccountId, setActiveAccountId } from '@/services/nextcloud/auth';
import { fetchCapabilities } from '@/services/nextcloud/nextcloud';
import { useAccountStore } from '@/stores/accountStore';
import { useCalendarStore } from '@/stores/calendarStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { queryClient } from '@/services/shared/queryClient';
import { setupOnlineManager } from '@/services/shared/network';
import { migrateFromAsyncStorage } from '@/storage';
import { Providers } from '@/components/Providers';
import '@/utils/i18n';
import { useLanguageSync } from '@/hooks/useLanguageSync';
SplashScreen.preventAutoHideAsync();

function ThemedStatusBar() {
  const { dark } = useTheme();
  return <StatusBar style={dark ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  const router = useRouter();
  const setStoreAccountId = useAccountStore((s) => s.setActiveAccountId);
  const setCapabilities = useAccountStore((s) => s.setCapabilities);
  useLanguageSync();

  useEffect(() => {
    const teardownOnline = setupOnlineManager();
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    });
    return () => {
      sub.remove();
      teardownOnline();
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await migrateFromAsyncStorage();
        await Promise.all([
          useAccountStore.persist.rehydrate(),
          useCalendarStore.persist.rehydrate(),
          useSettingsStore.persist.rehydrate(),
        ]);

        const accounts = await loadAccounts();
        queryClient.setQueryData(['accounts'], accounts);
        if (accounts.length === 0) {
          router.replace('/(auth)/setup');
        } else {
          const activeId = await getActiveAccountId();
          const id = activeId ?? accounts[0].id;
          await setActiveAccountId(id);
          setStoreAccountId(id);

          const activeAccount = accounts.find((a) => a.id === id) ?? accounts[0];
          fetchCapabilities(activeAccount).then(setCapabilities).catch(() => {});
        }
      } finally {
        await SplashScreen.hideAsync();
      }
    })();
  }, []);

  return (
    <Providers>
      <ThemedStatusBar />
      <Stack screenOptions={{ headerShown: false }} />
    </Providers>
  );
}
