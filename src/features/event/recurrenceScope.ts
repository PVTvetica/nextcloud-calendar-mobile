import { Alert } from 'react-native';

import i18n from '@/utils/i18n';
import type { RecurrenceEditScope } from '@/types';

export function askRecurrenceScope(
  title: string,
  onSelect: (scope: RecurrenceEditScope) => void,
  onCancel?: () => void,
): void {
  Alert.alert(
    title,
    i18n.t('event.recurrenceScopeMessage'),
    [
      { text: i18n.t('event.scopeThisOnly'), onPress: () => onSelect('this') },
      { text: i18n.t('event.scopeThisAndFollowingBtn'), onPress: () => onSelect('thisAndFollowing') },
      { text: i18n.t('event.scopeAllEvents'), onPress: () => onSelect('all') },
      { text: i18n.t('common.cancel'), style: 'cancel', onPress: onCancel },
    ],
    { cancelable: true, onDismiss: onCancel },
  );
}
