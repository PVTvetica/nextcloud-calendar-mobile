import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SettingsScreen from '../../app/(tabs)/settings/index';
import { useAppStore } from '../../src/store/appStore';
import i18n from '../../src/i18n';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn() }) }));
jest.mock('@react-navigation/bottom-tabs', () => ({ useBottomTabBarHeight: () => 0 }));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

describe('SettingsScreen i18n', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    useAppStore.setState({ language: 'en' });
  });

  it('renders the English title and Language label', () => {
    const { getByText } = render(<SettingsScreen />, { wrapper });
    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('Language')).toBeTruthy();
  });

  it('renders all four language chips', () => {
    const { getByText } = render(<SettingsScreen />, { wrapper });
    expect(getByText('English')).toBeTruthy();
    expect(getByText('Français')).toBeTruthy();
    expect(getByText('Deutsch')).toBeTruthy();
    expect(getByText('Español')).toBeTruthy();
  });

  it('tapping a chip updates the store language', () => {
    const { getByText } = render(<SettingsScreen />, { wrapper });
    fireEvent.press(getByText('Deutsch'));
    expect(useAppStore.getState().language).toBe('de');
  });
});
