import { hostnameOf } from '@/features/account/utils/account';
import type { Account, CalendarEvent, CalendarMeta } from '@/types';


export function accountOrganizerEmail(account: Account): string {
  if (account.email) return account.email;
  if (account.username.includes('@')) return account.username;
  return `${account.username}@${hostnameOf(account.baseUrl)}`;
}

export function canEditEvent(
  _event: CalendarEvent,
  calendar: CalendarMeta | undefined,
  account: Account | null,
): boolean {
  if (!account) return false;
  return !calendar?.isReadOnly && !calendar?.isSubscribed;
}
