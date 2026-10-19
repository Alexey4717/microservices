export const CABINET_PROTOCOL = 'cabinet';

export const APP_ROUTES = ['/', '/profile', '/system'] as const;

export type AppRoute = (typeof APP_ROUTES)[number];

export function parseCabinetUrl(raw: string): AppRoute | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (url.protocol !== `${CABINET_PROTOCOL}:` || url.hostname !== 'open') {
    return null;
  }

  let path = url.pathname;
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  if (path === '') {
    path = '/';
  }

  if (path === '/' || path === '/profile' || path === '/system') {
    return path;
  }

  return null;
}

export function cabinetRouteFromArgv(argv: readonly string[]): AppRoute | null {
  for (const arg of argv) {
    if (!arg.startsWith(`${CABINET_PROTOCOL}:`)) {
      continue;
    }
    const route = parseCabinetUrl(arg);
    if (route) {
      return route;
    }
  }
  return null;
}

export function devProtocolScript(
  defaultApp: boolean,
  argv1: string | undefined,
): string | null {
  if (!defaultApp || !argv1 || argv1.startsWith('-')) {
    return null;
  }
  return argv1;
}

export function navigationScript(route: AppRoute): string {
  return `window.location.hash = ${JSON.stringify(`#${route}`)}`;
}
