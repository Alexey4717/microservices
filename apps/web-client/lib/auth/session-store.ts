import type { AuthUser } from '@/lib/graphql/types';

import { rotateRefreshToken } from './rotate-session';

export type Session = {
  accessToken: string;
  refreshToken: string | null;
  user: AuthUser;
  setCookieHeaders: string[];
};

const SESSION_TTL_MS = 30_000;
const INVALID_TTL_MS = 5_000;

type CacheEntry = {
  expiresAt: number;
  session: Session | null;
};

const sessionCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<Session | null>>();

export function peekSession(refreshToken: string): Session | null | undefined {
  const entry = sessionCache.get(refreshToken);
  if (!entry) {
    return undefined;
  }
  if (entry.expiresAt <= Date.now()) {
    sessionCache.delete(refreshToken);
    return undefined;
  }
  return entry.session;
}

export async function loadSession(
  refreshToken: string,
): Promise<Session | null> {
  const cached = peekSession(refreshToken);
  if (cached !== undefined) {
    return cached;
  }

  const pending = inflight.get(refreshToken);
  if (pending) {
    return pending;
  }

  const request = refreshAndCache(refreshToken).finally(() => {
    inflight.delete(refreshToken);
  });
  inflight.set(refreshToken, request);
  return request;
}

function remember(
  refreshToken: string,
  session: Session | null,
  ttlMs: number,
): void {
  sessionCache.set(refreshToken, {
    expiresAt: Date.now() + ttlMs,
    session,
  });
  if (session?.refreshToken && session.refreshToken !== refreshToken) {
    sessionCache.set(session.refreshToken, {
      expiresAt: Date.now() + ttlMs,
      session,
    });
  }
}

async function refreshAndCache(refreshToken: string): Promise<Session | null> {
  const rotated = await rotateRefreshToken(refreshToken);
  if (!rotated.accessToken || !rotated.user) {
    remember(refreshToken, null, INVALID_TTL_MS);
    return null;
  }

  const session: Session = {
    accessToken: rotated.accessToken,
    refreshToken: rotated.refreshToken,
    user: rotated.user,
    setCookieHeaders: rotated.setCookieHeaders,
  };
  remember(refreshToken, session, SESSION_TTL_MS);
  return session;
}
