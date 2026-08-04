import { AccountFieldError, hostnameOf } from '@/features/account/utils/account';

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

describe('AccountFieldError', () => {
  it('carries the field codes for the form to render', () => {
    const error = new AccountFieldError({ appPassword: 'required' });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AccountFieldError');
    expect(error.fields).toEqual({ appPassword: 'required' });
  });
});
