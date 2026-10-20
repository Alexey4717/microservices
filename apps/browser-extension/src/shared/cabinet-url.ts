import { CABINET_ORIGIN } from './constants';

export function videoIdFromPathname(pathname: string): string | null {
  const path =
    pathname.length > 1 && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname;
  const match = /^\/videos\/([^/]+)$/.exec(path);
  if (!match || match[1] === 'new') return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function videoIdFromHref(
  href: string | null,
  base: string,
): string | null {
  if (!href) return null;

  try {
    const url = new URL(href, base);
    if (url.origin !== CABINET_ORIGIN) return null;
    return videoIdFromPathname(url.pathname);
  } catch {
    return null;
  }
}

export function videoIdFromPageUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.origin !== CABINET_ORIGIN) return null;
    return videoIdFromPathname(url.pathname);
  } catch {
    return null;
  }
}

export function isCabinetPageUrl(raw: string | undefined): boolean {
  if (!raw?.startsWith(CABINET_ORIGIN)) return false;
  const next = raw.charAt(CABINET_ORIGIN.length);
  return next === '' || next === '/' || next === '?' || next === '#';
}

export function cabinetPathname(raw: string | undefined): string | null {
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.origin !== CABINET_ORIGIN) return null;
    return url.pathname || '/';
  } catch {
    return null;
  }
}
