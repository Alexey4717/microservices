import type { Request, Response } from 'express';

export const REFRESH_TOKEN_COOKIE_NAME = 'refresh-token';

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) {
    return undefined;
  }

  for (const part of header.split(';')) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator);
    if (key !== name) {
      continue;
    }

    return decodeURIComponent(trimmed.slice(separator + 1));
  }

  return undefined;
}

export function resolveRefreshToken(
  req: Request,
  inputToken?: string,
): string | undefined {
  const fromInput = inputToken?.trim();
  if (fromInput) {
    return fromInput;
  }

  const fromCookie = readCookie(req, REFRESH_TOKEN_COOKIE_NAME)?.trim();
  return fromCookie || undefined;
}

export function setRefreshTokenCookie(
  res: Response,
  token: string,
  options: { maxAgeMs: number; secure: boolean },
): void {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: options.secure,
    maxAge: options.maxAgeMs,
  });
}

export function clearRefreshTokenCookie(res: Response, secure: boolean): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    path: '/',
    sameSite: 'lax',
    secure,
  });
}
