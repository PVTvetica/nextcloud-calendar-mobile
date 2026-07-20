import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from '@react-navigation/native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { asyncStorage } from '@/storage';
import { queryClient } from '@/services/shared/queryClient';
import { useAppStore } from '@/stores/appStore';
import { lightTheme, darkTheme } from '@/theme';

const asyncStoragePersister = createAsyncStoragePersister({
  storage: asyncStorage,
  key: 'rq-cache',
  throttleTime: 3000,
});

export function Providers({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const themePreference = useAppStore((s) => s.themePreference);
  const resolved =
    themePreference === 'system' ? (systemScheme ?? 'light') : themePreference;
  const theme = resolved === 'dark' ? darkTheme : lightTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <ThemeProvider value={theme}>{children}</ThemeProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
