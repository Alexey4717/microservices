import { cookies } from 'next/headers';

import {
  type ParsedCookieJar,
  applyParsedSetCookie,
} from './apply-parsed-cookie';
import { REFRESH_COOKIE_NAME } from './constants';
import { parseSetCookieHeader, readSetCookieHeaders } from './parse-set-cookie';

export function buildRefreshSetCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${REFRESH_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export function setCookieHeadersFrom(
  response: Response,
  refreshToken: string | null,
  keepSession: boolean,
): string[] {
  const fromResponse = readSetCookieHeaders(response);
  if (fromResponse.length > 0) {
    return fromResponse;
  }
  if (keepSession && refreshToken) {
    return [buildRefreshSetCookieHeader(refreshToken)];
  }
  return [];
}

export async function applySetCookieHeaders(
  setCookieHeaders: readonly string[],
): Promise<void> {
  if (setCookieHeaders.length === 0) {
    return;
  }

  try {
    const cookieStore = await cookies();
    const jar: ParsedCookieJar = {
      set: (cookie) => {
        cookieStore.set(cookie);
      },
      delete: (cookie) => {
        cookieStore.delete(cookie);
      },
    };

    for (const header of setCookieHeaders) {
      const parsed = parseSetCookieHeader(header);
      if (!parsed) {
        continue;
      }
      applyParsedSetCookie(parsed, jar);
    }
  } catch (error) {
    if (isReadonlyCookiesError(error)) {
      return;
    }
    throw error;
  }
}

export async function applySetCookiesFromResponse(
  response: Response,
  fallbackRefreshToken?: string,
): Promise<void> {
  const headers = readSetCookieHeaders(response);
  if (headers.length > 0) {
    await applySetCookieHeaders(headers);
    return;
  }

  if (!fallbackRefreshToken) {
    return;
  }

  await applySetCookieHeaders([
    buildRefreshSetCookieHeader(fallbackRefreshToken),
  ]);
}

export async function persistRefreshCookie(
  refreshToken: string | undefined,
): Promise<void> {
  if (!refreshToken) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: REFRESH_COOKIE_NAME,
    value: refreshToken,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearRefreshCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete({ name: REFRESH_COOKIE_NAME, path: '/' });
  } catch (error) {
    if (isReadonlyCookiesError(error)) {
      return;
    }
    throw error;
  }
}

function isReadonlyCookiesError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('Cookies can only be modified')
  );
}
