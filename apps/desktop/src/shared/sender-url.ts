export const DEV_RENDERER_ORIGIN = 'http://127.0.0.1:4002';

export function isTrustedSenderUrl(
  frameUrl: string | null | undefined,
  packagedIndexUrl: string,
): boolean {
  if (!frameUrl) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(frameUrl);
  } catch {
    return false;
  }

  if (url.username || url.password) {
    return false;
  }

  if (url.origin === DEV_RENDERER_ORIGIN) {
    return true;
  }

  const actual = fileIdentity(frameUrl);
  const expected = fileIdentity(packagedIndexUrl);
  return actual !== null && expected !== null && actual === expected;
}

function fileIdentity(fileUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(fileUrl);
  } catch {
    return null;
  }

  if (url.protocol !== 'file:') {
    return null;
  }

  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }

  if (/^\/[A-Za-z]:\//.test(pathname)) {
    pathname = pathname.slice(1);
  }

  const normalized = pathname.replaceAll('\\', '/').toLowerCase();
  return normalized.length > 0 ? normalized : null;
}
