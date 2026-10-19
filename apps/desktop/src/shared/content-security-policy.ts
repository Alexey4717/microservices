export function buildPackagedCsp(graphqlUrl: string): string {
  let connectSrc = "'self'";
  try {
    const origin = new URL(graphqlUrl).origin;
    if (origin && origin !== 'null') {
      connectSrc = `'self' ${origin}`;
    }
  } catch {
    connectSrc = "'self'";
  }

  return `default-src 'self'; connect-src ${connectSrc}`;
}

export function withContentSecurityPolicy(
  responseHeaders: Record<string, readonly string[] | undefined> | undefined,
  policy: string,
): Record<string, string[]> {
  const headers: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(responseHeaders ?? {})) {
    if (!value || key.toLowerCase() === 'content-security-policy') {
      continue;
    }
    headers[key] = [...value];
  }
  headers['Content-Security-Policy'] = [policy];
  return headers;
}
