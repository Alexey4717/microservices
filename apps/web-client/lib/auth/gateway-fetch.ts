import { cookies } from 'next/headers';

import { REFRESH_COOKIE_NAME } from './constants';
import { refreshCookieHeader } from './gateway-request';

export { postGatewayGraphQL, refreshCookieHeader } from './gateway-request';

export async function gatewayFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;

  const headers = new Headers(init?.headers);
  if (refreshToken && !headers.has('cookie')) {
    headers.set('cookie', refreshCookieHeader(refreshToken));
  }

  return fetch(input, {
    ...init,
    headers,
    cache: 'no-store',
  });
}
