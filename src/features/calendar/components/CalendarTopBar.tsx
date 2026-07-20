import { memo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { styles } from '@/styles/calendarScreen';
import { useTheme } from '@react-navigation/native';
import type { ViewMode } from '@/types';
import { VIEW_MODES } from '../constants';

interface Props {
  headerTitle: string;
  isToday: boolean;
  todayLoading: boolean;
  viewMode: ViewMode;
  onOpenDrawer: () => void;
  onToday: () => void;
  onSwitchMode: (mode: ViewMode) => void;
}

const VIEW_MODE_KEYS: Record<ViewMode, string> = {
  month: 'calendar.month',
  week: 'calendar.week',
  '3days': 'calendar.threeDays',
  day: 'calendar.day',
  schedule: 'calendar.schedule',
};

function CalendarTopBarImpl({ headerTitle, isToday, todayLoading, viewMode, onOpenDrawer, onToday, onSwitchMode }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.headerWrap, { backgroundColor: theme.colors.headerBackground, borderBottomColor: theme.colors.border }]}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onOpenDrawer} style={styles.hamburger}>
          <Text style={[styles.hamburgerIcon, { color: theme.colors.primary }]}>☰</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {headerTitle}
        </Text>
        <TouchableOpacity
          style={[styles.todayBtn, { opacity: isToday && !todayLoading ? 0.35 : 1 }]}
          onPress={onToday}
          disabled={isToday || todayLoading}
        >
          {todayLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={[styles.todayBtnText, { color: theme.colors.primary }]}>{t('calendar.today')}</Text>
          )}
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modePills}>
        {VIEW_MODES.map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.modeBtn,
              { backgroundColor: theme.colors.chip },
              viewMode === mode && { backgroundColor: theme.colors.chipActive },
            ]}
            onPress={() => onSwitchMode(mode)}
          >
            <Text
              numberOfLines={1}
              allowFontScaling={false}
              style={[
                styles.modeBtnText,
                { color: theme.colors.textSecondary },
                viewMode === mode && { color: theme.colors.primaryText, fontWeight: '600' },
              ]}
            >
              {t(VIEW_MODE_KEYS[mode])}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export const CalendarTopBar = memo(CalendarTopBarImpl);
