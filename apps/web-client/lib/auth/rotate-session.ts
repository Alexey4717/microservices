import {
  RefreshDocument,
  type RefreshMutation,
} from '@libs/graphql/operations/auth/refresh.generated';

import { type AuthUser, toAccountTier } from '@/lib/auth/auth-user';
import type { GraphQLResponse } from '@/lib/graphql/response';

import {
  GatewayUnavailableError,
  isFetchFailed,
  isUnauthenticated,
} from './gateway-errors';
import { postGatewayGraphQL, refreshCookieHeader } from './gateway-request';
import { setCookieHeadersFrom } from './set-cookie';

export type RotateResult = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setCookieHeaders: string[];
};

export async function rotateRefreshToken(
  refreshToken: string,
): Promise<RotateResult> {
  let response: Response;
  try {
    response = await postGatewayGraphQL(
      RefreshDocument,
      { input: { refreshToken } },
      { cookie: refreshCookieHeader(refreshToken) },
    );
  } catch (error) {
    throw toRotateError(error);
  }

  let json: GraphQLResponse<RefreshMutation>;

  try {
    json = (await response.json()) as GraphQLResponse<RefreshMutation>;
  } catch {
    throw new Error('Не удалось обновить сессию');
  }

  const payload = json.data?.refresh;
  const accessToken = payload?.accessToken ?? null;
  const nextRefreshToken = payload?.refreshToken ?? null;
  const user = payload?.user
    ? {
        ...payload.user,
        accountTier: toAccountTier(payload.user.accountTier),
      }
    : null;
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

function toRotateError(error: unknown): Error {
  if (isFetchFailed(error)) {
    return new GatewayUnavailableError();
  }
  if (error instanceof Error) {
    return error;
  }
  return new Error('Не удалось обновить сессию');
}
