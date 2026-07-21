import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '@react-navigation/native';

interface IconProps extends ViewProps {
  children?: React.ReactNode;
  color?: string;
  size?: number;
  opacity?: number;
}

function injectProps(children: React.ReactNode, color: string, size: number): React.ReactNode {
  const inject = (child: React.ReactElement<any>) => {
    const next: Record<string, unknown> = {};
    if (child.props.color === undefined) next.color = color;
    if (child.props.size === undefined) next.size = size;
    return Object.keys(next).length ? React.cloneElement(child, next) : child;
  };

  if (React.isValidElement(children)) return inject(children as React.ReactElement<any>);
  return React.Children.map(children, (child) =>
    React.isValidElement(child) ? inject(child as React.ReactElement<any>) : child
  );
}

function Icon({ children, color, size = 24, opacity, style, ...rest }: IconProps) {
  const { colors } = useTheme();
  const chip = Boolean(color);
  const glyphColor = chip ? '#ffffff' : colors.text;

  return (
    <View
      {...rest}
      style={[
        { alignItems: 'center', justifyContent: 'center', width: size, height: size },
        chip && {
          padding: 4,
          borderRadius: 8,
          marginRight: -4,
          width: undefined,
          height: undefined,
          backgroundColor: color,
        },
        opacity !== undefined && { opacity },
        style,
      ]}
    >
      {injectProps(children, glyphColor, size)}
    </View>
  );
}

export default React.memo(Icon);
