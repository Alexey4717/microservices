import { cookies } from 'next/headers';

import { REFRESH_COOKIE_NAME } from './constants';
import { parseSetCookieHeader, readSetCookieHeaders } from './parse-set-cookie';

export async function applySetCookieHeaders(
  setCookieHeaders: readonly string[],
): Promise<void> {
  if (setCookieHeaders.length === 0) {
    return;
  }

  try {
    const cookieStore = await cookies();
    for (const header of setCookieHeaders) {
      const parsed = parseSetCookieHeader(header);
      if (!parsed) {
        continue;
      }

      if (!parsed.value) {
        cookieStore.delete({
          name: parsed.name,
          path: parsed.path ?? '/',
        });
        continue;
      }

      cookieStore.set({
        name: parsed.name,
        value: parsed.value,
        httpOnly: parsed.httpOnly ?? true,
        path: parsed.path ?? '/',
        sameSite: parsed.sameSite ?? 'lax',
        secure: parsed.secure ?? false,
        maxAge: parsed.maxAge,
      });
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
    `${REFRESH_COOKIE_NAME}=${fallbackRefreshToken}; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax`,
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
