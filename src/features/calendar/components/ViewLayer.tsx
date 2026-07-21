import { memo } from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';

interface Props extends ViewProps {
  visible: boolean;
}

function ViewLayerImpl({ visible, style, children, ...rest }: Props) {
  return (
    <View
      {...rest}
      style={[StyleSheet.absoluteFill, { opacity: visible ? 1 : 0, zIndex: visible ? 1 : 0 }, style]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {children}
    </View>
  );
}

export const ViewLayer = memo(ViewLayerImpl);
