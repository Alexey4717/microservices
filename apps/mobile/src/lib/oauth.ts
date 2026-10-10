import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { gatewayOrigin } from '@/lib/graphql-url';

const NATIVE_OAUTH_REDIRECT = 'mobile://auth/callback';

export const OAUTH_CANCELLED_MESSAGE =
  'Вход через провайдера отменён. Попробуйте ещё раз.';

export type OauthProvider = 'google' | 'github';

export type OauthStartResult =
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'error' }
  | { kind: 'cancel' };

export function oauthRedirectUrl(): string {
  if (Platform.OS === 'web') {
    return Linking.createURL('auth/callback');
  }
  return NATIVE_OAUTH_REDIRECT;
}

export function parseOauthHash(
  url: string,
): { accessToken: string; refreshToken: string } | null {
  const hashIndex = url.indexOf('#');
  if (hashIndex < 0) {
    return null;
  }

  const params = new URLSearchParams(url.slice(hashIndex + 1));
  const accessToken = params.get('accessToken') ?? '';
  const refreshToken = params.get('refreshToken') ?? '';
  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export async function startProviderOauth(
  provider: OauthProvider,
): Promise<OauthStartResult> {
  const redirectUrl = oauthRedirectUrl();
  const result = await WebBrowser.openAuthSessionAsync(
    `${gatewayOrigin()}/auth/${provider}?client=mobile`,
    redirectUrl,
  );

  if (result.type !== 'success') {
    return { kind: 'cancel' };
  }

  const tokens = parseOauthHash(result.url);
  if (tokens) {
    return { kind: 'tokens', ...tokens };
  }

  return { kind: 'error' };
}
