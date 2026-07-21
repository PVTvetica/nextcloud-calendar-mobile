import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useTheme } from 'expo-router';

function ViewContainer({ children, style, ...rest }: ViewProps) {
  const { colors } = useTheme();
  return (
    <View {...rest} style={[styles.root, { backgroundColor: colors.background }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default React.memo(ViewContainer);
