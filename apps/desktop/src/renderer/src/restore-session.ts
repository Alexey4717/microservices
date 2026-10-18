import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';

import { RefreshDocument } from '@libs/graphql/operations/auth/refresh.generated';

import { apolloClient } from './apollo';
import { readAccessToken, rememberAccessToken } from './auth-session';
import {
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from './desktop-session';

const SESSION_EXPIRED = 'Сессия истекла. Войдите снова.';

export type RestoreResult =
  { status: 'authenticated' } | { status: 'anonymous'; notice: string | null };

let restoreInFlight: Promise<RestoreResult> | null = null;

export function restoreSession(): Promise<RestoreResult> {
  if (!restoreInFlight) {
    restoreInFlight = performRestore().finally(() => {
      restoreInFlight = null;
    });
  }
  return restoreInFlight;
}

async function performRestore(): Promise<RestoreResult> {
  if (readAccessToken()) {
    return { status: 'authenticated' };
  }

  let refreshToken: string | null;
  try {
    refreshToken = await getRefreshToken();
  } catch {
    return { status: 'anonymous', notice: null };
  }

  if (!refreshToken) {
    return { status: 'anonymous', notice: null };
  }

  try {
    const result = await apolloClient.mutate({
      mutation: RefreshDocument,
      variables: { input: { refreshToken } },
    });
    const payload = result.data?.refresh;
    if (!payload?.accessToken) {
      await dropStoredRefreshToken();
      return { status: 'anonymous', notice: SESSION_EXPIRED };
    }

    rememberAccessToken(payload.accessToken);
    if (payload.refreshToken) {
      try {
        await setRefreshToken(payload.refreshToken);
      } catch {
        await dropStoredRefreshToken();
      }
    } else {
      await dropStoredRefreshToken();
    }
    return { status: 'authenticated' };
  } catch (error) {
    await dropStoredRefreshToken();
    return {
      status: 'anonymous',
      notice: isAuthError(error) ? SESSION_EXPIRED : null,
    };
  }
}

async function dropStoredRefreshToken(): Promise<void> {
  try {
    await clearRefreshToken();
  } catch {
    // Локальный файл уже мог отсутствовать.
  }
}

function isAuthError(error: unknown): boolean {
  if (ServerError.is(error)) {
    return error.statusCode === 401 || error.statusCode === 403;
  }
  if (!CombinedGraphQLErrors.is(error)) {
    return false;
  }
  return error.errors.some((item) => {
    const code = extensionCode(item.extensions);
    if (code === 'UNAUTHENTICATED' || code === 'FORBIDDEN') {
      return true;
    }
    return /unauthor|unauthenticated|invalid refresh|refresh token/i.test(
      item.message,
    );
  });
}

function extensionCode(
  extensions: { readonly [key: string]: unknown } | undefined,
): string | null {
  const code = extensions?.code;
  return typeof code === 'string' ? code : null;
}
