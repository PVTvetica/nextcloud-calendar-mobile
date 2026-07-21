import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';
import AnimatedPressable from './AnimatedPressable';
import Typography from './Typography';

interface ChipProps {
  active?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  rounded?: boolean;
  activeColor?: string;
  children?: React.ReactNode;
}

function Chip({
  active = false, onPress, icon, disabled = false, fullWidth = false, rounded = false, activeColor, children,
}: ChipProps) {
  const { colors, radius } = useTheme();
  const activeBg = activeColor ?? colors.chipActive;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      animated={!disabled}
      style={[
        styles.chip,
        {
          borderRadius: rounded ? radius.pill : radius.sm,
          backgroundColor: active ? activeBg : colors.surface,
          borderWidth: 1.5,
          borderColor: active ? activeBg : colors.border,
          opacity: disabled ? 0.5 : 1,
          flex: fullWidth ? 1 : undefined,
        },
      ]}
    >
      {icon}
      {typeof children === 'string' ? (
        <Typography variant="body2" align="center" color={active ? 'light' : 'secondary'}>
          {children}
        </Typography>
      ) : (
        children
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
});

export default React.memo(Chip);
