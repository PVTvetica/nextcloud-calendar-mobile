import { useTranslation } from 'react-i18next';

import { useSettingsStore } from '@/stores/settingsStore';
import { SettingsPage } from '@/features/settings/components/SettingsPage';
import { Divider, Stack, Toggle, Typography } from '@/ui/components';

const cardOuter = { marginHorizontal: 16, marginBottom: 12 };

export default function AccessibilitySettingsScreen() {
  const { t } = useTranslation();
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const setHapticsEnabled = useSettingsStore((s) => s.setHapticsEnabled);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const setReduceMotion = useSettingsStore((s) => s.setReduceMotion);
  const scaleCalendarText = useSettingsStore((s) => s.scaleCalendarText);
  const setScaleCalendarText = useSettingsStore((s) => s.setScaleCalendarText);

  const rows = [
    {
      key: 'haptics',
      title: t('settings.accessibility.haptics'),
      hint: t('settings.accessibility.hapticsHint'),
      value: hapticsEnabled,
      onChange: setHapticsEnabled,
    },
    {
      key: 'reduceMotion',
      title: t('settings.accessibility.reduceMotion'),
      hint: t('settings.accessibility.reduceMotionHint'),
      value: reduceMotion,
      onChange: setReduceMotion,
    },
    {
      key: 'scaleCalendarText',
      title: t('settings.accessibility.scaleCalendarText'),
      hint: t('settings.accessibility.scaleCalendarTextHint'),
      value: scaleCalendarText,
      onChange: setScaleCalendarText,
    },
  ];

  return (
    <SettingsPage title={t('settings.accessibility.title')}>
      <Stack card gap={12} padding={16} hAlign="stretch" style={cardOuter}>
        {rows.map((row, i) => (
          <Stack key={row.key} gap={12} hAlign="stretch">
            {i > 0 && <Divider />}
            <Stack direction="horizontal" vAlign="center" gap={12}>
              <Stack gap={2} style={{ flex: 1 }}>
                <Typography variant="body1">{row.title}</Typography>
                <Typography variant="caption" color="secondary">{row.hint}</Typography>
              </Stack>
              <Toggle
                value={row.value}
                onValueChange={row.onChange}
                accessibilityLabel={row.title}
              />
            </Stack>
          </Stack>
        ))}
      </Stack>
    </SettingsPage>
  );
}
