import type {
  AuthPayload,
  AuthUser,
  GraphQLResponse,
} from '@/lib/graphql/types';

import { REFRESH_COOKIE_NAME } from './constants';
import { postGatewayGraphQL, refreshCookieHeader } from './gateway-request';
import { readSetCookieHeaders } from './parse-set-cookie';

export type RotateResult = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setCookieHeaders: string[];
};

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

const REFRESH_QUERY = `
  mutation Refresh($input: RefreshInput) {
    refresh(input: $input) {
      accessToken
      refreshToken
      user {
        id
        email
        name
        avatarUrl
      }
    }
  }
`;

export async function rotateRefreshToken(
  refreshToken: string,
): Promise<RotateResult> {
  let response: Response;
  try {
    response = await postGatewayGraphQL(
      REFRESH_QUERY,
      { input: { refreshToken } },
      { cookie: refreshCookieHeader(refreshToken) },
    );
  } catch (error) {
    throw toRotateError(error);
  }

  let json: GraphQLResponse<{
    refresh?: (AuthPayload & { refreshToken?: string }) | undefined;
  }>;

  try {
    json = (await response.json()) as GraphQLResponse<{
      refresh?: (AuthPayload & { refreshToken?: string }) | undefined;
    }>;
  } catch {
    throw new Error('Не удалось обновить сессию');
  }

  const payload = json.data?.refresh;
  const accessToken = payload?.accessToken ?? null;
  const nextRefreshToken = payload?.refreshToken ?? null;
  const user = payload?.user ?? null;
  const setCookieHeaders = setCookieHeadersFrom(
    response,
    nextRefreshToken,
    Boolean(accessToken),
  );

  if (accessToken && user) {
    return {
      accessToken,
      refreshToken: nextRefreshToken,
      user,
      setCookieHeaders,
    };
  }

  if (isUnauthenticated(json) || (json.errors && json.errors.length > 0)) {
    return {
      accessToken: null,
      refreshToken: null,
      user: null,
      setCookieHeaders,
    };
  }

  throw new Error('Не удалось обновить сессию');
}

export function setCookieHeadersFrom(
  response: Response,
  refreshToken: string | null,
  keepSession: boolean,
): string[] {
  const fromResponse = readSetCookieHeaders(response);
  if (fromResponse.length > 0) {
    return fromResponse;
  }
  if (keepSession && refreshToken) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return [
      `${REFRESH_COOKIE_NAME}=${encodeURIComponent(refreshToken)}; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax${secure}`,
    ];
  }
  return [];
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

function toRotateError(error: unknown): Error {
  if (isFetchFailed(error)) {
    return new GatewayUnavailableError();
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error('Не удалось обновить сессию');
}

function isFetchFailed(error: unknown): boolean {
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
