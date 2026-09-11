import { cookies, headers } from 'next/headers';
import { cache } from 'react';

import { ACCESS_TOKEN_HEADER } from './constants';
import { getSession } from './session';

export const getAccessToken = cache(async (): Promise<string | null> => {
  const session = await getSession();
  if (session?.accessToken) {
    return session.accessToken;
  }

  const headerStore = await headers();
  return (
    headerStore.get(ACCESS_TOKEN_HEADER) ??
    headerStore.get(`x-middleware-request-${ACCESS_TOKEN_HEADER}`) ??
    headerStore.get(`x-proxy-request-${ACCESS_TOKEN_HEADER}`) ??
    (await cookies()).get(ACCESS_TOKEN_HEADER)?.value ??
    null
  );
});
