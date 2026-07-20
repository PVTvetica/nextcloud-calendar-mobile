import React from 'react';
import { ThemeProvider } from '@react-navigation/native';
import { lightTheme } from '../../src/theme';

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider value={lightTheme}>{children}</ThemeProvider>;
}
