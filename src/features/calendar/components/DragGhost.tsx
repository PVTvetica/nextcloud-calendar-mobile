import { memo } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import type { GridEvent } from '../utils/toGridEvents';
import { contrastFor } from '../utils/eventInk';

interface Props {
  event: GridEvent;
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
 *
 * It wears the event's own appearance rather than a placeholder's — no outline,
 * no handles — so the gesture reads as picking the event up. A light shadow
 * carries the "lifted" cue that the border used to, and the original underneath
 * stays dimmed.
 */
function DragGhostImpl({ event, top, height, left, width }: Props) {
  const ink = contrastFor(event.color);
  const style = useAnimatedStyle(() => ({
    top: top.value,
    height: height.value,
    left: left.value,
  }));

  return (
    <Animated.View
      testID="drag-ghost"
      pointerEvents="none"
      style={[styles.ghost, { width, backgroundColor: event.color }, style]}
    >
      <Text numberOfLines={1} style={[styles.title, { color: ink.text }]}>
        {event.title}
      </Text>
    </Animated.View>
  );
}

export const DragGhost = memo(DragGhostImpl);

const styles = StyleSheet.create({
  ghost: {
    position: 'absolute',
    zIndex: 20000,
    // Matches TimeGridEvent's card so the lifted box is the same object.
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    justifyContent: 'center',
    // The lift cue, replacing the old outline.
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  title: { fontSize: 12, fontWeight: '600' },
});
