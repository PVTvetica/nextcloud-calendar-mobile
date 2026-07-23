import { memo } from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';

interface Props extends ViewProps {
  visible: boolean;
}

function ViewLayerImpl({ visible, style, children, ...rest }: Props) {
  return (
    <View
      {...rest}
      style={[StyleSheet.absoluteFill, { display: visible ? 'flex' : 'none' }, style]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {children}
    </View>
  );
}

export const ViewLayer = memo(ViewLayerImpl);
