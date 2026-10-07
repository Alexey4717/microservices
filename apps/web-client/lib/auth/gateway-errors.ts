import type { GraphQLResponse } from '@/lib/graphql/response';

export class GatewayUnavailableError extends Error {
  constructor(message = 'Не удалось обновить сессию') {
    super(message);
    this.name = 'GatewayUnavailableError';
  }
}

const NETWORK_ERROR_CODES = new Set([
  'EACCES',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
]);

export function isGatewayUnavailableError(error: unknown): boolean {
  if (error instanceof GatewayUnavailableError) {
    return true;
  }
  if (error instanceof Error && error.name === 'GatewayUnavailableError') {
    return true;
  }
  return isFetchFailed(error);
}

export function isUnauthenticated(json: GraphQLResponse<unknown>): boolean {
  return Boolean(
    json.errors?.some((error) => {
      const code = error.extensions?.code;
      const status = error.extensions?.http?.status;
      return (
        code === 'UNAUTHENTICATED' ||
        status === 401 ||
        /unauthor/i.test(error.message)
      );
    }),
  );
}

export function firstGraphQLErrorMessage(
  json: GraphQLResponse<unknown>,
): string | undefined {
  return json.errors?.[0]?.message;
}

export function isFetchFailed(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  if (error.message === 'fetch failed' || /fetch failed/i.test(error.message)) {
    return true;
  }
  return collectErrorCodes(error).some((code) => NETWORK_ERROR_CODES.has(code));
}

function collectErrorCodes(error: unknown): string[] {
  const codes: string[] = [];
  const seen = new Set<unknown>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object' || seen.has(value)) {
      return;
    }
    seen.add(value);
    if ('code' in value && typeof value.code === 'string') {
      codes.push(value.code);
    }
    if ('cause' in value) {
      visit(value.cause);
    }
    if (value instanceof AggregateError) {
      for (const inner of value.errors) {
        visit(inner);
      }
    }
  };
  visit(error);
  return codes;
}
