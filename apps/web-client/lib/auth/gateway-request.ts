import { type DocumentNode, print } from 'graphql';

import { getGraphqlUrl } from '@/lib/graphql/url';

import { REFRESH_COOKIE_NAME } from './constants';

export function refreshCookieHeader(token: string): string {
  return `${REFRESH_COOKIE_NAME}=${encodeURIComponent(token)}`;
}

export async function postGatewayGraphQL(
  document: DocumentNode | string,
  variables?: Record<string, unknown>,
  options?: { cookie?: string; accessToken?: string | null },
): Promise<Response> {
  const headers = new Headers({
    'content-type': 'application/json',
  });

  if (options?.cookie) {
    headers.set('cookie', options.cookie);
  }

  if (options?.accessToken) {
    headers.set('authorization', `Bearer ${options.accessToken}`);
  }

  const query = typeof document === 'string' ? document : print(document);

  return fetch(getGraphqlUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });
}
