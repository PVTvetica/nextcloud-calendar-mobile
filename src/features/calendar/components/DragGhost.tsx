import { memo } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import type { GridEvent } from '../utils/toGridEvents';
import { contrastFor } from '../utils/eventInk';

interface Props {
  event: GridEvent;
  top: SharedValue<number>;
  height: SharedValue<number>;
  left: SharedValue<number>;
  width: number;
}

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
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  title: { fontSize: 12, fontWeight: '600' },
});
