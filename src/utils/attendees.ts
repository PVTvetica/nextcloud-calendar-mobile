import type { Attendee } from '@/types';

/**
 * Collapse attendees that are the same person.
 *
 * An ICS may legitimately carry the same ATTENDEE address twice — servers
 * rewrite entries, invitations get merged, exports duplicate the organizer as
 * an attendee. Rendering the same address twice is wrong on its own, and it
 * also breaks any list keyed by email.
 *
 * Comparison is on the trimmed, lowercased address, since RFC 5321 treats the
 * domain as case-insensitive and no calendar server distinguishes mailboxes by
 * case in practice. The first occurrence wins, except that a later duplicate
 * carrying a display name fills one in when the first had none — a bare
 * `mailto:` entry followed by a named one should keep the name.
 *
 * Attendees without an address cannot be compared, so they are all kept.
 */
export function dedupeAttendees(attendees: Attendee[]): Attendee[] {
  const byEmail = new Map<string, Attendee>();
  const result: Attendee[] = [];

  for (const attendee of attendees) {
    const key = attendee.email?.trim().toLowerCase();
    if (!key) {
      result.push(attendee);
      continue;
    }

    const seen = byEmail.get(key);
    if (!seen) {
      const copy = { ...attendee };
      byEmail.set(key, copy);
      result.push(copy);
      continue;
    }

    if (!seen.displayName && attendee.displayName) {
      seen.displayName = attendee.displayName;
    }
  }

  return result;
}
