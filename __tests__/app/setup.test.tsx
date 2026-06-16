import React from 'react';
import { render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SetupScreen from '../../app/(auth)/setup';
import { useAppStore } from '../../src/store/appStore';
import i18n from '../../src/i18n';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn() }) }));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

describe('SetupScreen i18n', () => {
  it('renders the English title by default', async () => {
    await i18n.changeLanguage('en');
    useAppStore.setState({ language: 'en' });
    const { getByText } = render(<SetupScreen />, { wrapper });
    expect(getByText('Connect to Nextcloud')).toBeTruthy();
  });

  it('renders the French title when language is fr', async () => {
    await i18n.changeLanguage('fr');
    useAppStore.setState({ language: 'fr' });
    const { getByText } = render(<SetupScreen />, { wrapper });
    expect(getByText('Se connecter à Nextcloud')).toBeTruthy();
  });
});
