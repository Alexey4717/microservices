import { cookies, headers } from 'next/headers';
import { cache } from 'react';

import {
  ACCESS_TOKEN_HEADER,
  REFRESH_COOKIE_NAME,
  SESSION_USER_HEADER,
} from './constants';
import { isPrefetchRequest, isServerActionRequest } from './request-kind';
import { type Session, loadSession, peekSession } from './session-store';
import { decodeSessionUser } from './session-user';
import { applySetCookieHeaders } from './set-cookie';

export type { Session } from './session-store';
export { sessionDisplayName } from './session-user';

export const getSession = cache(async (): Promise<Session | null> => {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;

  if (refreshToken) {
    const cached = peekSession(refreshToken);
    if (cached !== undefined) {
      return cached;
    }
  }

  const fromProxy = readSessionFromProxy(headerStore, cookieStore);
  if (fromProxy) {
    return fromProxy;
  }

  if (!refreshToken) {
    return null;
  }

  if (isPrefetchRequest(headerStore) || isServerActionRequest(headerStore)) {
    return null;
  }

  const session = await loadSession(refreshToken);
  if (session?.setCookieHeaders.length) {
    await applySetCookieHeaders(session.setCookieHeaders);
  }
  return session;
});

function readSessionFromProxy(
  headerStore: Headers,
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): Session | null {
  const accessToken =
    headerStore.get(ACCESS_TOKEN_HEADER) ??
    headerStore.get(`x-middleware-request-${ACCESS_TOKEN_HEADER}`) ??
    headerStore.get(`x-proxy-request-${ACCESS_TOKEN_HEADER}`) ??
    cookieStore.get(ACCESS_TOKEN_HEADER)?.value ??
    null;

  const rawUser =
    headerStore.get(SESSION_USER_HEADER) ??
    headerStore.get(`x-middleware-request-${SESSION_USER_HEADER}`) ??
    headerStore.get(`x-proxy-request-${SESSION_USER_HEADER}`);
  const user = rawUser ? decodeSessionUser(rawUser) : null;

  if (!accessToken || !user) {
    return null;
  }

  return {
    accessToken,
    refreshToken: cookieStore.get(REFRESH_COOKIE_NAME)?.value ?? null,
    user,
    setCookieHeaders: [],
  };
}
