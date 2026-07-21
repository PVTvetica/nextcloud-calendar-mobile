import React from 'react';
import { useTheme } from 'expo-router';
import AnimatedPressable from './AnimatedPressable';

type Variant = 'ghost' | 'filled' | 'plain';

interface IconButtonProps {
  onPress?: () => void;
  size?: number;
  variant?: Variant;
  disabled?: boolean;
  children?: React.ReactNode;
}

function IconButton({ onPress, size = 44, variant = 'ghost', disabled = false, children }: IconButtonProps) {
  const { colors, radius } = useTheme();

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      animated={!disabled}
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: variant === 'plain' ? 'transparent' : colors.surface,
        borderWidth: variant === 'plain' ? 0 : 1.5,
        borderColor: colors.border,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </AnimatedPressable>
  );
}

export default React.memo(IconButton);
