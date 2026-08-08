import type { Account } from '@/types';

/**
 * The organizer identity for an event authored (or re-saved) as `account`.
 *
 * There is no per-event organizer to preserve here: Nextcloud Calendar always
 * writes the acting account as ORGANIZER, whether creating, editing, or
 * dragging an event. `app/event/new.tsx` and `app/event/edit/[uid].tsx` used
 * to each inline this same five-line fallback chain; `eventToInput` (used on
 * the drag-to-move path) needs the identical value, so it lives here once.
 */
export function resolveOrganizer(account: Account): { organizerEmail: string; organizerName: string } {
  const organizerEmail = account.email
    || (account.username.includes('@')
      ? account.username
      : `${account.username}@${new URL(account.baseUrl).hostname}`);
  return { organizerEmail, organizerName: account.displayName };
}
