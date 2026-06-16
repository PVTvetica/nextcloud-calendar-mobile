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

  it('renders the title and the collapsible section headers', () => {
    const { getByText, queryByText } = render(<SettingsScreen />, { wrapper });
    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('Appearance')).toBeTruthy();
    expect(getByText('Accounts')).toBeTruthy();
    // Appearance is collapsed by default, so its Language control is hidden
    expect(queryByText('Language')).toBeNull();
  });

  it('expands Appearance, opens the dropdown and lists all four languages', () => {
    const { getByText, queryByText } = render(<SettingsScreen />, { wrapper });
    expect(queryByText('Deutsch')).toBeNull();
    fireEvent.press(getByText('Appearance')); // expand the section
    fireEvent.press(getByText('English'));     // open the language dropdown
    expect(getByText('Deutsch')).toBeTruthy();
    expect(getByText('Français')).toBeTruthy();
    expect(getByText('Español')).toBeTruthy();
  });

  it('selecting a language from the dropdown updates the store', () => {
    const { getByText } = render(<SettingsScreen />, { wrapper });
    fireEvent.press(getByText('Appearance'));
    fireEvent.press(getByText('English'));
    fireEvent.press(getByText('Deutsch'));
    expect(useAppStore.getState().language).toBe('de');
  });
});
