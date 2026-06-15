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

  // Theme recolor is never urgent. A light↔dark switch is a Zustand store write,
  // which is synchronous/urgent (useSyncExternalStore ignores startTransition) and
  // re-renders every useTheme consumer across both mounted tabs at once — that is
  // the latency. Deferring here pushes the repaint onto a low-priority,
  // interruptible pass so the toggle itself stays responsive. Selection feedback
  // on the settings chips uses urgent local state (pendingTheme), so it's instant.
  return useDeferredValue(theme);
}
