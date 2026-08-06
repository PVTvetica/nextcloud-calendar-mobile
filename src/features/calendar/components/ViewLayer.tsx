import { memo, useEffect, useState } from 'react';
import { View, StyleSheet, type ViewProps, type ViewStyle } from 'react-native';

interface Props extends ViewProps {
  visible: boolean;
}

// `display: 'none'` would be cheaper, but Yoga skips layout for such a subtree, so a
// pre-warmed layer measures itself at zero width and keeps that size until it is
// revealed — the calendar pager then sizes its pages to nothing. Staying laid out is
// what makes the pre-warm worth anything.
function visibilityStyle(visible: boolean): ViewStyle {
  return { opacity: visible ? 1 : 0, zIndex: visible ? 1 : 0 };
}

function ViewLayerImpl({ visible, style, children, ...rest }: Props) {
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (mounted) return;
    if (visible) {
      setMounted(true);
      return;
    }
    const id = setTimeout(() => setMounted(true), 1500);
    return () => clearTimeout(id);
  }, [visible, mounted]);

  return (
    <View
      {...rest}
      collapsable={false}
      style={[StyleSheet.absoluteFill, visibilityStyle(visible), style]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {mounted ? children : null}
    </View>
  );
}

export const ViewLayer = memo(ViewLayerImpl, (prev, next) => !prev.visible && !next.visible);
