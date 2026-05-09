export type ColorScheme = 'light' | 'dark';

export interface Theme {
  background: string;
  surface: string;
  surfaceRaised: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderSubtle: string;
  primary: string;
  primaryText: string;
  talk: string;
  danger: string;
  warning: string;
  tabBar: string;
  tabBarBorder: string;
  tabBarInactive: string;
  headerBackground: string;
  chip: string;
  chipActive: string;
}

export const lightTheme: Theme = {
  background: '#ffffff',
  surface: '#f5f5f5',
  surfaceRaised: '#ffffff',
  text: '#1a1a1a',
  textSecondary: '#555555',
  textTertiary: '#888888',
  border: '#eeeeee',
  borderSubtle: '#f5f5f5',
  primary: '#109be6',
  primaryText: '#ffffff',
  talk: '#0082c9',
  danger: '#d32f2f',
  warning: '#f57c00',
  tabBar: '#ffffff',
  tabBarBorder: '#e0e0e0',
  tabBarInactive: '#8e8e93',
  headerBackground: '#ffffff',
  chip: '#f0f0f0',
  chipActive: '#109be6',
};

export const darkTheme: Theme = {
  background: '#121212',
  surface: '#1e1e1e',
  surfaceRaised: '#2a2a2a',
  text: '#f1f1f1',
  textSecondary: '#aaaaaa',
  textTertiary: '#666666',
  border: '#333333',
  borderSubtle: '#242424',
  primary: '#29aef7',
  primaryText: '#ffffff',
  talk: '#29b6f6',
  danger: '#ef5350',
  warning: '#ffa726',
  tabBar: '#1c1c1e',
  tabBarBorder: '#2c2c2e',
  tabBarInactive: '#636366',
  headerBackground: '#1c1c1e',
  chip: '#2c2c2e',
  chipActive: '#29aef7',
};
