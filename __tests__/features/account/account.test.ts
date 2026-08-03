import {
  AccountFieldError, diffProfile, hostnameOf, validateProfilePatch,
} from '@/features/account/utils/account';
import type { Account } from '@/types';

function account(over: Partial<Account> = {}): Account {
  return {
    id: 'a1', displayName: 'Théo', baseUrl: 'https://cloud.example.com',
    username: 'theo', appPassword: 'x', davUserId: 'theo', timezone: 'Europe/Paris',
    email: 'theo@example.org',
    ...over,
  };
}

describe('hostnameOf', () => {
  it('extracts the host from a full URL', () => {
    expect(hostnameOf('https://cloud.example.com/nextcloud')).toBe('cloud.example.com');
  });

  it('drops the port', () => {
    expect(hostnameOf('https://cloud.example.com:8443')).toBe('cloud.example.com');
  });

  it('falls back to the raw string when it is not a URL', () => {
    expect(hostnameOf('cloud.example.com')).toBe('cloud.example.com');
    expect(hostnameOf('')).toBe('');
  });
});

describe('diffProfile', () => {
  it('reports nothing when the form is untouched', () => {
    expect(diffProfile(account(), { displayName: 'Théo', email: 'theo@example.org' })).toEqual({});
  });

  it('ignores fields the form did not supply', () => {
    expect(diffProfile(account(), { displayName: 'Théo L.' })).toEqual({ displayName: 'Théo L.' });
  });

  it('trims before comparing, so whitespace alone is not a change', () => {
    expect(diffProfile(account(), { displayName: '  Théo  ' })).toEqual({});
  });

  it('treats an absent stored email as an empty one', () => {
    expect(diffProfile(account({ email: undefined }), { email: '' })).toEqual({});
    expect(diffProfile(account({ email: undefined }), { email: 'new@example.org' }))
      .toEqual({ email: 'new@example.org' });
  });

  it('reports both fields when both changed', () => {
    expect(diffProfile(account(), { displayName: 'T', email: 'new@example.org' }))
      .toEqual({ displayName: 'T', email: 'new@example.org' });
  });
});

describe('validateProfilePatch', () => {
  it('accepts a well-formed patch', () => {
    expect(validateProfilePatch({ displayName: 'Théo', email: 'theo@example.org' })).toBeNull();
  });

  it('rejects a blank display name', () => {
    expect(validateProfilePatch({ displayName: '   ' })).toEqual({ displayName: 'required' });
  });

  it('allows clearing the email', () => {
    expect(validateProfilePatch({ email: '' })).toBeNull();
  });

  it('rejects a malformed email', () => {
    expect(validateProfilePatch({ email: 'theo@' })).toEqual({ email: 'invalidEmail' });
    expect(validateProfilePatch({ email: 'theo.example.org' })).toEqual({ email: 'invalidEmail' });
    expect(validateProfilePatch({ email: 'a b@example.org' })).toEqual({ email: 'invalidEmail' });
  });

  it('reports every offending field at once', () => {
    expect(validateProfilePatch({ displayName: '', email: 'nope' }))
      .toEqual({ displayName: 'required', email: 'invalidEmail' });
  });
});

describe('AccountFieldError', () => {
  it('carries the field codes for the form to render', () => {
    const error = new AccountFieldError({ email: 'invalidEmail' });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AccountFieldError');
    expect(error.fields).toEqual({ email: 'invalidEmail' });
  });
});
