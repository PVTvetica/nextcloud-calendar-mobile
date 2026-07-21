import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTheme } from 'expo-router';
import { AnimatedPressable, Icon } from '@/ui/components';

interface Props {
  onPress: () => void;
}

/** Floating action button that opens the new-event screen. Composes AnimatedPressable + Icon. */
function CalendarFabImpl({ onPress }: Props) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable onPress={onPress} style={[styles.fab, { backgroundColor: colors.primary }]}>
      <Icon size={28}>
        <Plus color="#ffffff" />
      </Icon>
    </AnimatedPressable>
  );
}

export const CalendarFab = memo(CalendarFabImpl);

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
