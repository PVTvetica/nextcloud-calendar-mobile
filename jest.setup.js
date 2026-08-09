jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@nozbe/watermelondb/adapters/sqlite', () => ({
  __esModule: true,
  default: class SQLiteAdapterMock {
    constructor(options) {
      Object.assign(this, options);
    }
  },
}));

jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (fn, ...args) => fn(...args),
}));

jest.mock('react-native-reanimated', () => {
  const { View, ScrollView } = require('react-native');
  return {
    __esModule: true,
    default: { View, ScrollView, createAnimatedComponent: (c) => c },
    View,
    ScrollView,
    createAnimatedComponent: (c) => c,
    useSharedValue: (v) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    // The anchored pinch scrolls from its worklet: it needs a ref it can hand
    // to `scrollTo`, and a scroll handler that keeps a shared value in step.
    // Neither does anything observable here — the mock runs no worklets — so
    // tests can assert the grid's structure but never that it scrolls.
    useAnimatedRef: () => ({ current: null }),
    useAnimatedScrollHandler: (h) => h,
    scrollTo: () => {},
    // Needed by react-native-gesture-handler's GestureDetector (useAnimatedGesture),
    // which calls this on every render regardless of which gesture is attached.
    useEvent: () => null,
    withTiming: (v) => v,
    withSpring: (v) => v,
    LinearTransition: {},
  };
});
