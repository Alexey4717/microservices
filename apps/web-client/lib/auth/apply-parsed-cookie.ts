import { NextResponse } from 'next/server';

import { type ParsedSetCookie, parseSetCookieHeader } from './parse-set-cookie';

type SameSite = NonNullable<ParsedSetCookie['sameSite']>;

export type ParsedCookieJar = {
  set: (cookie: {
    name: string;
    value: string;
    httpOnly: boolean;
    path: string;
    sameSite: SameSite;
    secure: boolean;
    maxAge?: number;
  }) => void;
  delete: (cookie: { name: string; path: string }) => void;
};

export function applyParsedSetCookie(
  parsed: ParsedSetCookie,
  jar: ParsedCookieJar,
): void {
  if (!parsed.value) {
    jar.delete({
      name: parsed.name,
      path: parsed.path ?? '/',
    });
    return;
  }

  jar.set({
    name: parsed.name,
    value: parsed.value,
    httpOnly: parsed.httpOnly ?? true,
    path: parsed.path ?? '/',
    sameSite: parsed.sameSite ?? 'lax',
    secure: parsed.secure ?? false,
    maxAge: parsed.maxAge,
  });
}

export function applySetCookiesToNextResponse(
  response: NextResponse,
  setCookieHeaders: readonly string[],
): void {
  const jar: ParsedCookieJar = {
    set: (cookie) => {
      response.cookies.set(cookie);
    },
    delete: (cookie) => {
      response.cookies.delete(cookie);
    },
  };

  for (const header of setCookieHeaders) {
    const parsed = parseSetCookieHeader(header);
    if (!parsed) {
      continue;
    }
    applyParsedSetCookie(parsed, jar);
  }
}
