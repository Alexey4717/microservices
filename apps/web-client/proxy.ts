import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  ACCESS_TOKEN_HEADER,
  REFRESH_COOKIE_NAME,
  SESSION_USER_HEADER,
} from '@/lib/auth/constants';
import { applySetCookiesToNextResponse } from '@/lib/auth/parse-set-cookie';
import {
  isPrefetchRequest,
  isServerActionRequest,
} from '@/lib/auth/request-kind';
import { loadSession } from '@/lib/auth/session-store';
import { encodeSessionUser } from '@/lib/auth/session-user';

const AUTH_PATHS = new Set(['/login', '/register']);

export async function proxy(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;
  const isAuthPath = AUTH_PATHS.has(pathname);

  if (!refreshToken && !isAuthPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (refreshToken && isAuthPath) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const requestHeaders = stripClientAuthHeaders(request.headers);

  const skipRefresh =
    !refreshToken ||
    isServerActionRequest(request.headers) ||
    isPrefetchRequest(request.headers);

  if (skipRefresh) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  try {
    const session = await loadSession(refreshToken);

    if (!session) {
      const login = NextResponse.redirect(new URL('/login', request.url));
      login.cookies.delete({ name: REFRESH_COOKIE_NAME, path: '/' });
      return login;
    }

    forwardSessionToRequest(requestHeaders, session.accessToken, session.user);
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    applySetCookiesToNextResponse(response, session.setCookieHeaders);
    return response;
  } catch {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }
}

export const config = {
  matcher: [
    '/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

function stripClientAuthHeaders(incoming: Headers): Headers {
  const requestHeaders = new Headers(incoming);
  requestHeaders.delete(ACCESS_TOKEN_HEADER);
  requestHeaders.delete(SESSION_USER_HEADER);

  const strippedCookie = withoutRequestCookie(
    withoutRequestCookie(
      requestHeaders.get('cookie') ?? '',
      ACCESS_TOKEN_HEADER,
    ),
    SESSION_USER_HEADER,
  );
  if (strippedCookie) {
    requestHeaders.set('cookie', strippedCookie);
  } else {
    requestHeaders.delete('cookie');
  }

  return requestHeaders;
}

function forwardSessionToRequest(
  requestHeaders: Headers,
  accessToken: string,
  user: Parameters<typeof encodeSessionUser>[0],
): void {
  requestHeaders.set(ACCESS_TOKEN_HEADER, accessToken);
  requestHeaders.set(SESSION_USER_HEADER, encodeSessionUser(user));
  requestHeaders.set(
    'cookie',
    withRequestCookie(
      requestHeaders.get('cookie') ?? '',
      ACCESS_TOKEN_HEADER,
      accessToken,
    ),
  );
}

function withoutRequestCookie(header: string, name: string): string {
  return header
    .split(';')
    .map((part) => part.trim())
    .filter(
      (part) =>
        part && !part.toLowerCase().startsWith(`${name.toLowerCase()}=`),
    )
    .join('; ');
}

function withRequestCookie(
  header: string,
  name: string,
  value: string,
): string {
  const rest = withoutRequestCookie(header, name);
  const pair = `${name}=${encodeURIComponent(value)}`;
  return rest ? `${rest}; ${pair}` : pair;
}
