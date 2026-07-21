jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (fn, ...args) => fn(...args),
}));

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c) => c },
    View,
    createAnimatedComponent: (c) => c,
    useSharedValue: (v) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: (v) => v,
    withSpring: (v) => v,
    LinearTransition: {},
  };
});
