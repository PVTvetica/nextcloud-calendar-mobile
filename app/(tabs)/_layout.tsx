import { Platform, DynamicColorIOS } from 'react-native';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Calendar, Settings as SettingsIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@react-navigation/native';

export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useTranslation();

  const useNativeTabs =
    Platform.OS === 'ios' &&
    parseInt(Platform.Version as string, 10) >= 26;

  if (useNativeTabs) {
    return (
      <NativeTabs
        labelStyle={{
          color: DynamicColorIOS({
            dark: 'white',
            light: 'black',
          }),
        }}
        tintColor={DynamicColorIOS({
          dark: 'white',
          light: 'black',
        })}
      >
        <NativeTabs.Trigger name="calendar/index">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'calendar', selected: 'calendar' }}
          />
        </NativeTabs.Trigger>

        <NativeTabs.Trigger name="settings/index">
          <NativeTabs.Trigger.Icon
            sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          />
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.tabBarBorder,
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="calendar/index"
        options={{
          title: t('tabs.calendar'),
          tabBarLabel: t('tabs.calendar'),
          tabBarIcon: ({ color, focused }) => (
            <Calendar
              size={focused ? 26 : 24}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: t('tabs.settings'),
          tabBarLabel: t('tabs.settings'),
          tabBarIcon: ({ color, focused }) => (
            <SettingsIcon
              size={focused ? 26 : 24}
              color={color}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
    </Tabs>
  );
}
