import { memo } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from 'expo-router';
import { HOUR_RAIL_WIDTH } from '../utils/grid';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface Props {
  hourRowHeight: number;
}

function HourRailImpl({ hourRowHeight }: Props) {
  const { colors } = useTheme();
  return (
    <View style={{ width: HOUR_RAIL_WIDTH, zIndex: 20 }}>
      {HOURS.map((hour) => (
        <View key={hour} testID={`hour-block-${hour}`} style={{ height: hourRowHeight }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center' }}>
            {`${hour}:00`}
          </Text>
        </View>
      ))}
    </View>
  );
}

export const HourRail = memo(HourRailImpl);
