import { useDeferredValue } from 'react';
import { useColorScheme } from 'react-native';
import { useAppStore } from '@/store/appStore';
import { lightTheme, darkTheme, type Theme } from '@/theme';

export function useTheme(): Theme {
  const systemScheme = useColorScheme();
  const themePreference = useAppStore((s) => s.themePreference);

  const resolved =
    themePreference === 'system'
      ? (systemScheme ?? 'light')
      : themePreference;

  const theme = resolved === 'dark' ? darkTheme : lightTheme;


  return useDeferredValue(theme);
}
