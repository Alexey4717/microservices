import { CombinedGraphQLErrors } from '@apollo/client/errors';

export function isPremiumConflict(error: unknown): boolean {
  if (!error) {
    return false;
  }
  if (CombinedGraphQLErrors.is(error)) {
    const graphQLError = error.errors[0];
    const code = graphQLError?.extensions?.code;
    const http = graphQLError?.extensions?.http;
    const status =
      typeof http === 'object' && http && 'status' in http
        ? http.status
        : undefined;
    if (code === 'CONFLICT' || status === 409) {
      return true;
    }
  }
  const message = error instanceof Error ? error.message : '';
  return /already purchased/i.test(message);
}
