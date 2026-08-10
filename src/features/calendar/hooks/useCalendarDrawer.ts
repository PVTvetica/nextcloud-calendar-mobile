import { useCallback, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { DRAWER_WIDTH } from '../constants';

export function useCalendarDrawer() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const drawerAnimation = useRef<Animated.CompositeAnimation | null>(null);

  const openDrawer = useCallback(() => {
    drawerAnimation.current?.stop();
    setDrawerOpen(true);
    drawerAnimation.current = Animated.parallel([
      Animated.timing(drawerAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]);
    drawerAnimation.current.start();
  }, [drawerAnim, overlayAnim]);

  const closeDrawer = useCallback(() => {
    drawerAnimation.current?.stop();
    setDrawerOpen(false);
    drawerAnimation.current = Animated.parallel([
      Animated.timing(drawerAnim, { toValue: -DRAWER_WIDTH, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]);
    drawerAnimation.current.start();
  }, [drawerAnim, overlayAnim]);

  const resetDrawer = useCallback(() => {
    drawerAnimation.current?.stop();
    drawerAnim.setValue(-DRAWER_WIDTH);
    overlayAnim.setValue(0);
    setDrawerOpen(false);
  }, [drawerAnim, overlayAnim]);

  useFocusEffect(useCallback(() => resetDrawer, [resetDrawer]));

  return { drawerOpen, drawerAnim, overlayAnim, openDrawer, closeDrawer };
}
