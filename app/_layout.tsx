import {focusManager} from '@tanstack/react-query';
import {PersistQueryClientProvider} from '@tanstack/react-query-persist-client';
import {createAsyncStoragePersister} from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Stack, useRouter} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {useDeferredValue, useEffect} from 'react';
import {AppState, Platform, type AppStateStatus, useColorScheme} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {loadAccounts, getActiveAccountId, setActiveAccountId} from '@/api/auth';
import {fetchCapabilities} from '@/api/nextcloud';
import {useAppStore} from '@/store/appStore';
import {queryClient} from '@/api/queryClient';
import {setupOnlineManager} from '@/api/network';
import '@/i18n';
import {useLanguageSync} from '@/hooks/useLanguageSync';
import {WidgetSyncBootstrap} from '@/widgets/sync';

SplashScreen.preventAutoHideAsync();

const asyncStoragePersister = createAsyncStoragePersister({
    storage: AsyncStorage,
    key: 'rq-cache',
    throttleTime: 3000,
});

function ThemedStatusBar() {
    const systemScheme = useColorScheme();
    const themePreference = useAppStore((s) => s.themePreference);
    const resolved =
        themePreference === 'system' ? (systemScheme ?? 'light') : themePreference;
    const deferredResolved = useDeferredValue(resolved);
    return <StatusBar style={deferredResolved === 'dark' ? 'light' : 'dark'}/>;
}

export default function RootLayout() {
    const router = useRouter();
    const setStoreAccountId = useAppStore((s) => s.setActiveAccountId);
    const setCapabilities = useAppStore((s) => s.setCapabilities);
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
                    fetchCapabilities(activeAccount).then(setCapabilities).catch(() => {
                    });
                }
            } finally {
                await SplashScreen.hideAsync();
            }
        })();
    }, []);

    return (
        <GestureHandlerRootView style={{flex: 1}}>
            <PersistQueryClientProvider
                client={queryClient}
                persistOptions={{persister: asyncStoragePersister}}
            >
                {Platform.OS === 'android' ? <WidgetSyncBootstrap/> : null}
                <ThemedStatusBar/>
                <Stack screenOptions={{headerShown: false}}/>
            </PersistQueryClientProvider>
        </GestureHandlerRootView>
    );
}
