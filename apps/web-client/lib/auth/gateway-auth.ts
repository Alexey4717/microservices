import { cookies } from 'next/headers';

import type { AuthPayload, GraphQLResponse } from '@/lib/graphql/types';

import { REFRESH_COOKIE_NAME } from './constants';
import { postGatewayGraphQL, refreshCookieHeader } from './gateway-request';
import { firstGraphQLErrorMessage, isUnauthenticated } from './rotate-session';
import { applySetCookiesFromResponse } from './set-cookie';

const LOGIN_QUERY = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      user { id email name avatarUrl }
    }
  }
`;

const REGISTER_QUERY = `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      refreshToken
      user { id email name avatarUrl }
    }
  }
`;

const LOGOUT_QUERY = `
  mutation Logout($input: LogoutInput) {
    logout(input: $input)
  }
`;

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<AuthPayload & { refreshToken?: string }> {
  return mutateAuth('login', LOGIN_QUERY, { input: { email, password } });
}

export async function registerWithPassword(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthPayload & { refreshToken?: string }> {
  return mutateAuth('register', REGISTER_QUERY, {
    input: {
      email: input.email,
      password: input.password,
      name: input.name,
    },
  });
}

export async function logoutAtGateway(refreshToken?: string): Promise<void> {
  const cookie = refreshToken
    ? refreshCookieHeader(refreshToken)
    : await currentRefreshCookieHeader();

  const response = await postGatewayGraphQL(
    LOGOUT_QUERY,
    { input: {} },
    { cookie },
  );
  await applySetCookiesFromResponse(response);

  const json = (await response.json()) as GraphQLResponse<{ logout?: boolean }>;
  if (json.data?.logout) {
    return;
  }
  if (isUnauthenticated(json)) {
    return;
  }
  if (json.errors?.length) {
    throw new Error(firstGraphQLErrorMessage(json) ?? 'Не удалось выйти');
  }
}

async function mutateAuth(
  field: 'login' | 'register',
  document: Parameters<typeof postGatewayGraphQL>[0],
  variables: Record<string, unknown>,
): Promise<AuthPayload & { refreshToken?: string }> {
  const response = await postGatewayGraphQL(document, variables);
  const json = (await response.json()) as GraphQLResponse<
    Record<typeof field, (AuthPayload & { refreshToken?: string }) | undefined>
  >;
  const payload = json.data?.[field];
  if (payload?.accessToken && payload.user) {
    await applySetCookiesFromResponse(response, payload.refreshToken);
    return {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: payload.user,
    };
  }

  throw new Error(
    firstGraphQLErrorMessage(json) ?? 'Не удалось выполнить запрос',
  );
}

async function currentRefreshCookieHeader(): Promise<string | undefined> {
  const token = (await cookies()).get(REFRESH_COOKIE_NAME)?.value;
  return token ? refreshCookieHeader(token) : undefined;
}
