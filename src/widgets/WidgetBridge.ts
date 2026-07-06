import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import type { WidgetSnapshot } from './model';

const WIDGET_SNAPSHOT_KEY = 'widget:snapshot:v1';
const ANDROID_WIDGET_NAMES = ['CalendarSmallWidget', 'CalendarMediumWidget'] as const;

function androidWidgets() {
  return require('./android-widgets') as {
    renderAndroidWidget: (widgetName: string, snapshot: WidgetSnapshot | null) => React.JSX.Element;
  };
}

export async function writeWidgetSnapshot(snapshot: WidgetSnapshot) {
  if (Platform.OS !== 'android') return;
  await AsyncStorage.setItem(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export async function readWidgetSnapshot(): Promise<WidgetSnapshot | null> {
  const raw = await AsyncStorage.getItem(WIDGET_SNAPSHOT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WidgetSnapshot;
  } catch {
    return null;
  }
}

export async function clearWidgetSnapshot() {
  if (Platform.OS !== 'android') return;
  await AsyncStorage.removeItem(WIDGET_SNAPSHOT_KEY);
}

export async function requestWidgetRefresh() {
  if (Platform.OS !== 'android') return;
  const snapshot = await readWidgetSnapshot();
  const { renderAndroidWidget } = androidWidgets();
  await Promise.all(
    ANDROID_WIDGET_NAMES.map((widgetName) =>
      requestWidgetUpdate({
        widgetName,
        renderWidget: () => renderAndroidWidget(widgetName, snapshot),
      })
    )
  );
}
