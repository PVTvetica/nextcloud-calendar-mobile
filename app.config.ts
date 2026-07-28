import type { ExpoConfig } from 'expo/config';
import { version } from './package.json';
const [major, minor, patch] = version.split('.').map(Number);

if (![major, minor, patch].every(Number.isInteger)) {
  throw new Error(
    `package.json: version "${version}" invalid`,
  );
}

const versionCode = major * 10000 + minor * 100 + patch;

const config: ExpoConfig = {
  name: 'Nextcloud Calendar',
  slug: 'nextcloud-calendar',
  scheme: 'nextcloud-calendar',
  version,
  orientation: 'default',
  userInterfaceStyle: 'automatic',
  platforms: ['ios', 'android'],
  icon: './assets/icon.png',
  assetBundlePatterns: ['**/*'],

  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.soluce.nextcloud-calendar',
    icon: './assets/icon-ios.icon',
    infoPlist: {
      CFBundleDisplayName: 'Nextcloud Calendar',
      LSApplicationQueriesSchemes: ['nextcloudtalk'],
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    package: 'com.soluce.nextcloudcalendar',
    versionCode,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#109be6',
    },
    softwareKeyboardLayoutMode: 'resize',
  },

  web: {
    favicon: './assets/favicon.png',
  },

  extra: {
    eas: {
      projectId: 'b344d590-32ff-417f-8c5a-f8e453288f60',
    },
  },
  owner: 'soluce',

  plugins: [
    '@morrowdigital/watermelondb-expo-plugin',
    '@react-native-community/datetimepicker',
    'expo-router',
    'expo-secure-store',
    'expo-web-browser',
    [
      'expo-camera',
      {
        cameraPermission:
          'Allow Calendar to access the camera to scan a Nextcloud login QR code.',
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#109be6',
        dark: {
          backgroundColor: '#109be6',
        },
      },
    ],
    'expo-localization',
    'expo-status-bar',
    'expo-font',
  ],
};

export default config;
