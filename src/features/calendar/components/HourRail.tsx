import { memo } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from 'expo-router';
import { HOUR_RAIL_WIDTH } from '../utils/grid';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

/**
 * The fixed left rail of hour labels.
 *
 * Zoom-independent by construction: the blocks divide the container's height
 * with flex rather than being sized from a pixel-per-hour value, so a pinch
 * that animates the container's height carries the rail with it and the rail
 * needs no animated node of its own.
 */
function HourRailImpl() {
  const { colors } = useTheme();
  return (
    // Opaque: the rail is pinned while day columns page under it, so a
    // transparent background would let event boxes show through it.
    <View style={{ width: HOUR_RAIL_WIDTH, zIndex: 20, backgroundColor: colors.background }}>
      {HOURS.map((hour) => (
        <View key={hour} testID={`hour-block-${hour}`} style={{ flex: 1 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center' }}>
            {`${hour}:00`}
          </Text>
        </View>
      ))}
    </View>
  );
}

export const HourRail = memo(HourRailImpl);
