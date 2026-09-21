const DEFAULT_WEB_ORIGIN = 'http://localhost:4000';

export function originFromUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return undefined;
  }
}

export function resolveGatewayCorsOrigins(
  corsOrigin: string | undefined,
  telegramMiniAppUrl: string | undefined,
): string | string[] {
  const web = corsOrigin?.trim() || DEFAULT_WEB_ORIGIN;
  const mini = originFromUrl(telegramMiniAppUrl);
  if (!mini || mini === web || mini === originFromUrl(web)) {
    return web;
  }
  return [web, mini];
}
