import { accountOrganizerEmail, canEditEvent } from '@/features/event/organizer';
import type { Account, CalendarEvent, CalendarMeta } from '@/types';

function account(over: Partial<Account> = {}): Account {
  return {
    id: 'a1', displayName: 'Théo', baseUrl: 'https://cloud.example.com',
    username: 'theo', appPassword: 'x', davUserId: 'theo', timezone: 'Europe/Paris',
    email: 'theo@example.org',
    ...over,
  };
}

function event(over: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    uid: 'e1', href: '/e1.ics', calendarId: 'c1', accountId: 'a1', summary: 'Event',
    dtstart: new Date(2026, 5, 19, 10), dtend: new Date(2026, 5, 19, 11),
    allDay: false, color: '#000', attendees: [], isRecurring: false,
    ...over,
  };
}

function calendar(over: Partial<CalendarMeta> = {}): CalendarMeta {
  return {
    id: 'c1', accountId: 'a1', displayName: 'Perso', color: '#000',
    ctag: '1', url: 'https://cloud.example.com/cal/', slug: 'perso',
    ...over,
  };
}

describe('accountOrganizerEmail', () => {
  it('uses the address read from the server', () => {
    expect(accountOrganizerEmail(account())).toBe('theo@example.org');
  });

  it('accepts a username that is already an address', () => {
    expect(accountOrganizerEmail(account({ email: '', username: 'theo@example.org' })))
      .toBe('theo@example.org');
  });

  it('synthesises username@host when the server gave us no address', () => {
    expect(accountOrganizerEmail(account({ email: '', username: 'theo' })))
      .toBe('theo@cloud.example.com');
  });
});

describe('canEditEvent', () => {
  it('allows a writable calendar', () => {
    expect(canEditEvent(event(), calendar(), account())).toBe(true);
  });

  it('refuses a read-only calendar', () => {
    expect(canEditEvent(event(), calendar({ isReadOnly: true }), account())).toBe(false);
  });

  it('refuses a subscribed calendar', () => {
    expect(canEditEvent(event(), calendar({ isSubscribed: true }), account())).toBe(false);
  });

  it('allows an event organised by someone else on a writable calendar', () => {
    expect(canEditEvent(event({ organizerEmail: 'boss@else.org' }), calendar(), account()))
      .toBe(true);
  });

  it('refuses when there is no account', () => {
    expect(canEditEvent(event(), calendar(), null)).toBe(false);
  });

  it('stays permissive while the calendar list is still loading', () => {
    expect(canEditEvent(event(), undefined, account())).toBe(true);
  });
});
