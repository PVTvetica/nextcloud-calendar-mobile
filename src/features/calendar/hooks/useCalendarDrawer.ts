import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSettingsStore } from '@/stores/settingsStore';
import { drawerWidthFor } from '../constants';

const SLIDE = { useNativeDriver: true, damping: 20, stiffness: 200, mass: 0.8 };

export function useCalendarDrawer() {
  const { width: screenWidth } = useWindowDimensions();
  const drawerWidth = drawerWidthFor(screenWidth);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-drawerWidth)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const drawerAnimation = useRef<Animated.CompositeAnimation | null>(null);
  const openRef = useRef(false);

  useEffect(() => {
    if (!openRef.current) drawerAnim.setValue(-drawerWidth);
  }, [drawerWidth, drawerAnim]);

  const slide = useCallback((toDrawer: number, toOverlay: number, fadeMs: number) => (
    reduceMotion
      ? Animated.parallel([
          Animated.timing(drawerAnim, { toValue: toDrawer, duration: 0, useNativeDriver: true }),
          Animated.timing(overlayAnim, { toValue: toOverlay, duration: 0, useNativeDriver: true }),
        ])
      : Animated.parallel([
          Animated.spring(drawerAnim, { toValue: toDrawer, ...SLIDE }),
          Animated.timing(overlayAnim, { toValue: toOverlay, duration: fadeMs, useNativeDriver: true }),
        ])
  ), [reduceMotion, drawerAnim, overlayAnim]);

  const openDrawer = useCallback(() => {
    drawerAnimation.current?.stop();
    openRef.current = true;
    setDrawerOpen(true);
    drawerAnimation.current = slide(0, 1, 250);
    drawerAnimation.current.start();
  }, [slide]);

  const closeDrawer = useCallback(() => {
    drawerAnimation.current?.stop();
    openRef.current = false;
    drawerAnimation.current = slide(-drawerWidth, 0, 200);
    drawerAnimation.current.start(({ finished }) => { if (finished) setDrawerOpen(false); });
  }, [slide, drawerWidth]);

  useFocusEffect(useCallback(() => () => {
    drawerAnimation.current?.stop();
    if (!openRef.current) return;
    openRef.current = false;
    drawerAnim.setValue(-drawerWidth);
    overlayAnim.setValue(0);
    setDrawerOpen(false);
  }, [drawerAnim, overlayAnim, drawerWidth]));

  return { drawerOpen, drawerAnim, overlayAnim, drawerWidth, openDrawer, closeDrawer };
}
