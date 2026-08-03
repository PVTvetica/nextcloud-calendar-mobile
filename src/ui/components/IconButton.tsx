import React from 'react';
import { useTheme } from 'expo-router';
import type { AccessibilityProps } from 'react-native';
import * as Haptics from 'expo-haptics';
import AnimatedPressable from './AnimatedPressable';

type Variant = 'ghost' | 'filled' | 'plain';

interface IconButtonProps extends AccessibilityProps {
  onPress?: () => void;
  size?: number;
  variant?: Variant;
  round?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  hapticFeedback?: Haptics.ImpactFeedbackStyle | null;
}

function IconButton({
  onPress, size = 44, variant = 'ghost', round = false, disabled = false, children,
  hapticFeedback = Haptics.ImpactFeedbackStyle.Light,
  ...accessibility
}: IconButtonProps) {
  const { colors, radius } = useTheme();

  return (
    <AnimatedPressable
      {...accessibility}
      onPress={onPress}
      disabled={disabled}
      animated={!disabled}
      hapticFeedback={hapticFeedback ?? undefined}
      style={{
        width: size,
        height: size,
        borderRadius: round ? size / 2 : radius.md,
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
