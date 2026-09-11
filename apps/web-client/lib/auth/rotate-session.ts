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
  const response = await postGatewayGraphQL(
    REFRESH_QUERY,
    { input: { refreshToken } },
    { cookie: refreshCookieHeader(refreshToken) },
  );

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
