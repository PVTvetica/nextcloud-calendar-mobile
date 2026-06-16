import { renderHook } from '@testing-library/react-native';
import { act } from 'react';
import { useLanguageSync } from '../../src/hooks/useLanguageSync';
import { useAppStore } from '../../src/store/appStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockChangeLanguage = jest.fn();
jest.mock('../../src/i18n', () => ({
  __esModule: true,
  default: { changeLanguage: (l: string) => mockChangeLanguage(l) },
}));

const mockDayjsLocale = jest.fn();
jest.mock('dayjs', () => ({
  __esModule: true,
  default: { locale: (l: string) => mockDayjsLocale(l) },
}));

describe('useLanguageSync', () => {
  beforeEach(() => {
    mockChangeLanguage.mockClear();
    mockDayjsLocale.mockClear();
    useAppStore.setState({ language: 'en' });
  });

  it('syncs i18n and dayjs to the current store language on mount', () => {
    useAppStore.setState({ language: 'fr' });
    renderHook(() => useLanguageSync());
    expect(mockChangeLanguage).toHaveBeenCalledWith('fr');
    expect(mockDayjsLocale).toHaveBeenCalledWith('fr');
  });

  it('re-syncs when the store language changes', () => {
    renderHook(() => useLanguageSync());
    mockChangeLanguage.mockClear();
    mockDayjsLocale.mockClear();
    act(() => {
      useAppStore.getState().setLanguage('de');
    });
    expect(mockChangeLanguage).toHaveBeenCalledWith('de');
    expect(mockDayjsLocale).toHaveBeenCalledWith('de');
  });

  it('falls back to en when the stored language is unsupported', () => {
    useAppStore.setState({ language: 'pt' as never });
    renderHook(() => useLanguageSync());
    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
    expect(mockDayjsLocale).toHaveBeenCalledWith('en');
  });
});
