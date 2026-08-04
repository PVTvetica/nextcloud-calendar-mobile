import { memo, useEffect, useState } from 'react';
import { View, StyleSheet, Platform, type ViewProps, type ViewStyle } from 'react-native';

interface Props extends ViewProps {
  visible: boolean;
}

function visibilityStyle(visible: boolean): ViewStyle {
  if (Platform.OS === 'ios') {
    return { opacity: visible ? 1 : 0, zIndex: visible ? 1 : 0 };
  }
  return { display: visible ? 'flex' : 'none' };
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

export const ViewLayer = memo(ViewLayerImpl);
