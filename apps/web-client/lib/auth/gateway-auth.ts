import { cookies } from 'next/headers';

import {
  LoginDocument,
  type LoginMutation,
} from '@libs/graphql/operations/auth/login.generated';
import {
  LogoutDocument,
  type LogoutMutation,
} from '@libs/graphql/operations/auth/logout.generated';
import {
  RegisterDocument,
  type RegisterMutation,
} from '@libs/graphql/operations/auth/register.generated';

import { toAccountTier } from '@/lib/auth/auth-user';
import type { GraphQLResponse } from '@/lib/graphql/response';

import { REFRESH_COOKIE_NAME } from './constants';
import { firstGraphQLErrorMessage, isUnauthenticated } from './gateway-errors';
import { postGatewayGraphQL, refreshCookieHeader } from './gateway-request';
import { applySetCookiesFromResponse } from './set-cookie';

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<LoginMutation['login']> {
  const response = await postGatewayGraphQL(LoginDocument, {
    input: { email, password },
  });
  const json = (await response.json()) as GraphQLResponse<LoginMutation>;
  return acceptAuthPayload(response, json, json.data?.login);
}

export async function registerWithPassword(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<RegisterMutation['register']> {
  const response = await postGatewayGraphQL(RegisterDocument, {
    input: {
      email: input.email,
      password: input.password,
      name: input.name,
    },
  });
  const json = (await response.json()) as GraphQLResponse<RegisterMutation>;
  return acceptAuthPayload(response, json, json.data?.register);
}

export async function logoutAtGateway(refreshToken?: string): Promise<void> {
  const cookie = refreshToken
    ? refreshCookieHeader(refreshToken)
    : await currentRefreshCookieHeader();

  const response = await postGatewayGraphQL(
    LogoutDocument,
    { input: {} },
    { cookie },
  );
  await applySetCookiesFromResponse(response);

  const json = (await response.json()) as GraphQLResponse<LogoutMutation>;
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

async function acceptAuthPayload(
  response: Response,
  json: GraphQLResponse<unknown>,
  payload: LoginMutation['login'] | RegisterMutation['register'] | undefined,
): Promise<LoginMutation['login']> {
  if (payload?.accessToken && payload.user) {
    await applySetCookiesFromResponse(response, payload.refreshToken);
    return {
      ...payload,
      user: {
        ...payload.user,
        accountTier: toAccountTier(payload.user.accountTier),
      },
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
