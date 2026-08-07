import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useTheme } from 'expo-router';
import type { DragMode } from '../utils/hitTest';
import type { GridEvent } from '../utils/toGridEvents';

interface Props {
  event: GridEvent;
  mode: DragMode;
  /** Pixels from the top of the 24-hour grid. Written by the drag worklet. */
  top: SharedValue<number>;
  height: SharedValue<number>;
  /** Pixels from the left of the page's column row. */
  left: SharedValue<number>;
  width: number;
}

/**
 * The single animated box shown while an event is being dragged or resized.
 *
 * Deliberately the only animated node in the grid: event boxes stay mute so the
 * cost of a page does not scale with a gesture that touches one event at a
 * time. It is mounted only while a drag is in flight.
 */
function DragGhostImpl({ event, mode, top, height, left, width }: Props) {
  const { colors } = useTheme();

  const style = useAnimatedStyle(() => ({
    top: top.value,
    height: height.value,
    left: left.value,
  }));

  return (
    <Animated.View
      testID="drag-ghost"
      pointerEvents="none"
      style={[styles.ghost, { width, backgroundColor: event.color, borderColor: colors.text }, style]}
    >
      <View testID="ghost-handle-start" style={[styles.handle, styles.handleTop]} />
      <Text numberOfLines={1} style={styles.title}>
        {event.title}
      </Text>
      <View testID="ghost-handle-end" style={[styles.handle, styles.handleBottom]} />
    </Animated.View>
  );
}

export const DragGhost = memo(DragGhostImpl);

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    zIndex: 20000,
    borderRadius: 6,
    borderWidth: 2,
    opacity: 0.9,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  title: { color: '#fff', fontSize: 12, fontWeight: '600' },
  handle: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  handleTop: { top: 0, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  handleBottom: { bottom: 0, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
});
