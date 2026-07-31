import type { Account, ServerCapabilities } from '@/types';
import { httpErrorFrom } from '../shared/errors';

function basicAuth(account: Pick<Account, 'username' | 'appPassword'>): string {
  return 'Basic ' + btoa(`${account.username}:${account.appPassword}`);
}

export async function exchangeOneTimeToken(params: {
  baseUrl: string;
  username: string;
  oneTimeToken: string;
}): Promise<string> {
  const url = `${params.baseUrl}/ocs/v2.php/core/getapppassword-onetime`;
  const res = await fetch(url, {
    credentials: 'omit',
    headers: {
      Authorization: 'Basic ' + btoa(`${params.username}:${params.oneTimeToken}`),
      'OCS-APIRequest': 'true',
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw httpErrorFrom(res, 'exchangeOneTimeToken');

  const json = await res.json();
  const appPassword = json?.ocs?.data?.apppassword;
  if (typeof appPassword !== 'string' || !appPassword) {
    throw new Error('exchangeOneTimeToken: response carried no apppassword');
  }
  return appPassword;
}

export async function fetchUserInfo(
  account: Pick<Account, 'baseUrl' | 'username' | 'appPassword' | 'davUserId'>
): Promise<{ timezone: string; email: string }> {
  try {
    const url = `${account.baseUrl}/ocs/v2.php/cloud/users/${encodeURIComponent(account.davUserId)}`;
    const res = await fetch(url, {
      credentials: 'omit',
      headers: {
        Authorization: basicAuth(account),
        'OCS-APIRequest': 'true',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return { timezone: '', email: '' };
    const json = await res.json();
    const data = json?.ocs?.data;
    return {
      timezone: (data?.timezone as string) || '',
      email: (data?.email as string) || '',
    };
  } catch {
    return { timezone: '', email: '' };
  }
}

export async function fetchCapabilities(
  account: Pick<Account, 'baseUrl' | 'username' | 'appPassword'>
): Promise<ServerCapabilities> {
  try {
    const url = `${account.baseUrl}/ocs/v2.php/cloud/capabilities`;
    const res = await fetch(url, {
      credentials: 'omit',
      headers: {
        Authorization: basicAuth(account),
        'OCS-APIRequest': 'true',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return { calendarEnabled: true, talkEnabled: false };
    const json = await res.json();
    const apps: Record<string, unknown> = json?.ocs?.data?.capabilities ?? {};

    const calendarEnabled = 'dav' in apps || 'calendar' in apps;
    const talkEnabled = 'spreed' in apps;

    return { calendarEnabled, talkEnabled };
  } catch {
    return { calendarEnabled: true, talkEnabled: false };
  }
}
