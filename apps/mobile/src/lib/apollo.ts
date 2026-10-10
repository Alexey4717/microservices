import {
  ApolloClient,
  ApolloLink,
  HttpLink,
  InMemoryCache,
} from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { ErrorLink } from '@apollo/client/link/error';
import { Observable } from '@apollo/client/utilities';

import { RefreshDocument } from '@libs/graphql/operations/auth/refresh.generated';
import type { UserFieldsFragment } from '@libs/graphql/operations/user/user-fields.generated';

import {
  clearSession,
  notifySessionCleared,
  readAccessToken,
  readRefreshToken,
  rememberAccessToken,
  writeRefreshToken,
} from '@/lib/auth-session';
import { isUnauthenticatedError } from '@/lib/graphql-error';
import { graphqlUrl } from '@/lib/graphql-url';
import { uploadLink } from '@/lib/upload-link';

const SKIP_REFRESH = new Set(['Login', 'Register', 'Refresh', 'Logout']);

let refreshInFlight: Promise<UserFieldsFragment | null> | null = null;

export const apolloClient = new ApolloClient({
  cache: new InMemoryCache(),
  link: new ErrorLink(({ error, operation, forward }) => {
    const context = operation.getContext();
    if (
      context.skipAuthRefresh ||
      context.authRetried ||
      SKIP_REFRESH.has(operation.operationName ?? '') ||
      !isUnauthenticatedError(error)
    ) {
      return;
    }

    return new Observable((observer) => {
      void refreshSession()
        .then((user) => {
          if (!user) {
            observer.error(error);
            return;
          }
          operation.setContext({ authRetried: true });
          forward(operation).subscribe(observer);
        })
        .catch((refreshError: unknown) => {
          observer.error(refreshError);
        });
    });
  }).concat(
    new SetContextLink((prevContext) => {
      const accessToken = readAccessToken();
      if (!accessToken) {
        return prevContext;
      }

      return {
        headers: {
          ...prevContext.headers,
          authorization: `Bearer ${accessToken}`,
        },
      };
    }).concat(
      ApolloLink.split(
        (operation) => operation.operationName === 'UploadAvatar',
        uploadLink,
        new HttpLink({
          uri: graphqlUrl(),
          credentials: 'omit',
        }),
      ),
    ),
  ),
});

export function refreshSession(): Promise<UserFieldsFragment | null> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function performRefresh(): Promise<UserFieldsFragment | null> {
  const refreshToken = await readRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const result = await apolloClient.mutate({
      mutation: RefreshDocument,
      variables: { input: { refreshToken } },
      context: { skipAuthRefresh: true },
    });
    const payload = result.data?.refresh;
    if (!payload?.accessToken || !payload.refreshToken || !payload.user?.id) {
      await clearSession();
      notifySessionCleared();
      return null;
    }

    rememberAccessToken(payload.accessToken);
    await writeRefreshToken(payload.refreshToken);
    return payload.user;
  } catch {
    await clearSession();
    notifySessionCleared();
    return null;
  }
}
