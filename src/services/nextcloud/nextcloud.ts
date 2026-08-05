import type { Account, ServerCapabilities } from '@/types';
import { httpErrorFrom } from '../shared/errors';

function basicAuth(account: Pick<Account, 'username' | 'appPassword'>): string {
  return 'Basic ' + btoa(`${account.username}:${account.appPassword}`);
}

async function ocsFetch(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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

export interface NextcloudUserProfile {
  timezone: string;
  email: string;
  displayName: string;
}

export async function fetchUserInfo(
  account: Pick<Account, 'baseUrl' | 'username' | 'appPassword' | 'davUserId'>
): Promise<NextcloudUserProfile | null> {
  try {
    const url = `${account.baseUrl}/ocs/v2.php/cloud/users/${encodeURIComponent(account.davUserId)}`;
    const res = await ocsFetch(url, {
      credentials: 'omit',
      headers: {
        Authorization: basicAuth(account),
        'OCS-APIRequest': 'true',
        Accept: 'application/json',
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.ocs?.data;
    if (!data) return null;
    return {
      timezone: (data.timezone as string) || '',
      email: (data.email as string) || '',
      displayName: (data.displayname as string) || (data['display-name'] as string) || '',
    };
  } catch {
    return null;
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
