export const DEFAULT_GRAPHQL_URL = 'http://127.0.0.1:3000/graphql';

export function resolveGraphqlUrl(configured: string | undefined): string {
  const trimmed = configured?.trim();
  if (!trimmed) {
    return DEFAULT_GRAPHQL_URL;
  }

  try {
    new URL(trimmed);
  } catch {
    return DEFAULT_GRAPHQL_URL;
  }

  return trimmed;
}
