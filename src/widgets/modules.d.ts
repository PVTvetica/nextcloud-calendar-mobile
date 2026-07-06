declare module 'react-native-android-widget' {
  import type { ReactNode } from 'react';

  export type WidgetTaskHandlerProps = {
    widgetAction: string;
    widgetInfo: { widgetName: string };
    renderWidget: (widget: ReactNode) => void;
  };

  export function requestWidgetUpdate(args: { widgetName: string }): Promise<void>;
  export function registerWidgetTaskHandler(
    handler: (props: WidgetTaskHandlerProps) => void | Promise<void>
  ): void;
  export function FlexWidget(props: any): ReactNode;
  export function TextWidget(props: any): ReactNode;
}

declare module 'expo-widgets' {
  export type WidgetEnvironment = { widgetFamily: 'systemSmall' | 'systemMedium' | string };
  export function createWidget<Props>(
    name: string,
    component: (props: Props, environment: WidgetEnvironment) => any
  ): { updateSnapshot: (props: Props) => void };
}

declare module '@expo/ui/swift-ui' {
  export const HStack: any;
  export const Link: any;
  export const Text: any;
  export const VStack: any;
}

declare module '@expo/ui/swift-ui/modifiers' {
  export const background: (...args: any[]) => any;
  export const cornerRadius: (...args: any[]) => any;
  export const font: (...args: any[]) => any;
  export const foregroundStyle: (...args: any[]) => any;
  export const frame: (...args: any[]) => any;
  export const padding: (...args: any[]) => any;
}
