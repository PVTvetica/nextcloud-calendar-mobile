import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, useWindowDimensions } from 'react-native';
import { drawerWidthFor } from '../constants';

export function useCalendarDrawer() {
  const { width: screenWidth } = useWindowDimensions();
  const drawerWidth = drawerWidthFor(screenWidth);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-drawerWidth)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const drawerAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const openRef = useRef(false);

  useEffect(() => {
    if (!openRef.current) drawerAnim.setValue(-drawerWidth);
  }, [drawerWidth, drawerAnim]);

  const openDrawer = useCallback(() => {
    drawerAnimation.current?.stop();
    openRef.current = true;
    setDrawerOpen(true);
    drawerAnimation.current = Animated.parallel([
      Animated.spring(drawerAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200, mass: 0.8 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]);
    drawerAnimation.current.start();
  }, [drawerAnim, overlayAnim]);

  const closeDrawer = useCallback(() => {
    drawerAnimation.current?.stop();
    openRef.current = false;
    drawerAnimation.current = Animated.parallel([
      Animated.spring(drawerAnim, { toValue: -drawerWidth, useNativeDriver: true, damping: 20, stiffness: 200, mass: 0.8 }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]);
    drawerAnimation.current.start(({ finished }) => { if (finished) setDrawerOpen(false); });
  }, [drawerAnim, overlayAnim, drawerWidth]);

  return { drawerOpen, drawerAnim, overlayAnim, drawerWidth, openDrawer, closeDrawer };
}
