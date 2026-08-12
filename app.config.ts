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
  name: 'Nextcloud Calendar Fork',
  slug: 'nextcloud-calendar-fork',
  scheme: 'nextcloud-calendar-fork',
  version,
  orientation: 'default',
  userInterfaceStyle: 'automatic',
  platforms: ['ios', 'android'],
  icon: './assets/icon.png',
  assetBundlePatterns: ['**/*'],

  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.custom.nextcloud-calendar',
    icon: './assets/icon-ios.icon',
    infoPlist: {
      CFBundleDisplayName: 'Nextcloud Calendar Fork',
      LSApplicationQueriesSchemes: ['nextcloudtalk'],
      ITSAppUsesNonExemptEncryption: false,
    },
    entitlements: {
      'com.apple.security.application-groups': ['group.com.custom.nextcloud-calendar'],
    },
  },

  android: {
    package: 'com.custom.nextcloudcalendar',
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

  // Fork note: the upstream EAS project (owner "soluce", its projectId) was removed.
  // Run `eas init` once to link this fork to your own Expo account before using EAS builds.

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
    'expo-notifications',
    'expo-background-task',
    [
      'expo-widgets',
      {
        bundleIdentifier: "com.custom.nextcloud-calendar.ExpoWidgetsTarget",
        groupIdentifier: 'group.com.custom.nextcloud-calendar',
        widgets: [
          {
            name: 'NextcloudCalendarWidget',
            displayName: 'Nextcloud Calendar Fork',
            description: 'Your upcoming events',
            contentMarginsDisabled: true,
            supportedFamilies: [
              'systemSmall',
              'systemMedium',
              'systemLarge',
              'accessoryInline',
              'accessoryCircular',
              'accessoryRectangular',
            ],
          },
        ],
      },
    ],
    [
      'react-native-android-widget',
      {
        widgets: [
          {
            name: 'CalendarSmallWidget',
            label: 'Nextcloud Calendar Fork',
            minWidth: '110dp',
            minHeight: '110dp',
            targetCellWidth: 2,
            targetCellHeight: 2,
            description: 'Shows the next upcoming event',
            previewImage: './assets/icon.png',
            updatePeriodMillis: 1800000,
            resizeMode: 'horizontal|vertical',
          },
          {
            name: 'CalendarMediumWidget',
            label: 'Nextcloud Calendar Fork',
            minWidth: '250dp',
            minHeight: '110dp',
            targetCellWidth: 4,
            targetCellHeight: 2,
            description: 'Shows up to three upcoming events',
            previewImage: './assets/icon.png',
            updatePeriodMillis: 1800000,
            resizeMode: 'horizontal|vertical',
          },
          {
            name: 'CalendarLargeWidget',
            label: 'Nextcloud Calendar Fork',
            minWidth: '250dp',
            minHeight: '250dp',
            targetCellWidth: 4,
            targetCellHeight: 4,
            description: 'Multi-day agenda grouped by day',
            previewImage: './assets/icon.png',
            updatePeriodMillis: 1800000,
            resizeMode: 'horizontal|vertical',
          },
        ],
      },
    ],
  ],
};

export default config;
