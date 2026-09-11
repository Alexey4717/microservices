import { NextResponse } from 'next/server';

type SameSite = 'lax' | 'strict' | 'none';

export type ParsedSetCookie = {
  name: string;
  value: string;
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: SameSite;
  maxAge?: number;
  expires?: Date;
};

export function parseSetCookieHeader(header: string): ParsedSetCookie | null {
  const parts = header
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
  const first = parts[0];
  if (!first) {
    return null;
  }

  const separator = first.indexOf('=');
  if (separator === -1) {
    return null;
  }

  const parsed: ParsedSetCookie = {
    name: first.slice(0, separator).trim(),
    value: decodeCookieValue(first.slice(separator + 1)),
  };

  for (const attribute of parts.slice(1)) {
    const [rawKey, ...rawValue] = attribute.split('=');
    const key = rawKey.trim().toLowerCase();
    const value = rawValue.join('=').trim();

    if (key === 'httponly') {
      parsed.httpOnly = true;
    } else if (key === 'secure') {
      parsed.secure = true;
    } else if (key === 'path') {
      parsed.path = value;
    } else if (key === 'max-age') {
      const maxAge = Number(value);
      if (!Number.isNaN(maxAge)) {
        parsed.maxAge = maxAge;
      }
    } else if (key === 'samesite') {
      const sameSite = value.toLowerCase();
      if (sameSite === 'lax' || sameSite === 'strict' || sameSite === 'none') {
        parsed.sameSite = sameSite;
      }
    } else if (key === 'expires') {
      parsed.expires = new Date(value);
    }
  }

  return parsed;
}

export function readSetCookieHeaders(response: Response): string[] {
  if (typeof response.headers.getSetCookie === 'function') {
    const cookies = response.headers.getSetCookie();
    if (cookies.length > 0) {
      return cookies;
    }
  }

  const raw = (
    response.headers as unknown as { raw?: () => Record<string, string[]> }
  ).raw?.()['set-cookie'];
  if (raw?.length) {
    return raw;
  }

  const joined = response.headers.get('set-cookie');
  return joined ? [joined] : [];
}

function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function applySetCookiesToNextResponse(
  response: NextResponse,
  setCookieHeaders: readonly string[],
): void {
  for (const header of setCookieHeaders) {
    const parsed = parseSetCookieHeader(header);
    if (!parsed) {
      continue;
    }

    if (!parsed.value) {
      response.cookies.delete({
        name: parsed.name,
        path: parsed.path ?? '/',
      });
      continue;
    }

    response.cookies.set({
      name: parsed.name,
      value: parsed.value,
      httpOnly: parsed.httpOnly ?? true,
      path: parsed.path ?? '/',
      sameSite: parsed.sameSite ?? 'lax',
      secure: parsed.secure ?? false,
      maxAge: parsed.maxAge,
    });
  }
}
