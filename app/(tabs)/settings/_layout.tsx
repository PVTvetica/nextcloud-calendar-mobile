import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false }}
      screenListeners={({ navigation, route }) => ({
        blur: () => {
          const state = navigation.getState();
          if (!state || state.index === 0) return;
          if (state.routes[state.index]?.key !== route.key) return;
          navigation.dispatch({ type: 'POP_TO_TOP' });
        },
      })}
    />
  );
}
