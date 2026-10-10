import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as Linking from 'expo-linking';

import { LogoutDocument } from '@libs/graphql/operations/auth/logout.generated';
import { MeDocument } from '@libs/graphql/operations/user/me.generated';
import type { UserFieldsFragment } from '@libs/graphql/operations/user/user-fields.generated';

import { apolloClient, refreshSession } from '@/lib/apollo';
import {
  clearSession,
  readRefreshToken,
  rememberAccessToken,
  subscribeSessionCleared,
  writeRefreshToken,
} from '@/lib/auth-session';
import { parseOauthHash } from '@/lib/oauth';

export type AuthUser = UserFieldsFragment;

type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

type SessionContextValue = {
  ready: boolean;
  user: AuthUser | null;
  signIn: (payload: AuthPayload) => Promise<void>;
  applyOauthTokens: (tokens: {
    accessToken: string;
    refreshToken: string;
  }) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const applyOauthTokens = useCallback(
    async (tokens: { accessToken: string; refreshToken: string }) => {
      rememberAccessToken(tokens.accessToken);
      await writeRefreshToken(tokens.refreshToken);
      try {
        const result = await apolloClient.query({
          query: MeDocument,
          fetchPolicy: 'network-only',
        });
        const me = result.data?.me;
        if (!me?.id) {
          await clearSession();
          setUser(null);
          return false;
        }
        setUser(me);
        return true;
      } catch {
        await clearSession();
        setUser(null);
        return false;
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const initialUrl = await Linking.getInitialURL();
      const oauthTokens = initialUrl ? parseOauthHash(initialUrl) : null;
      if (oauthTokens) {
        const ok = await applyOauthTokens(oauthTokens);
        if (!cancelled && !ok) {
          setUser(null);
        }
        if (!cancelled) {
          setReady(true);
        }
        return;
      }

      const nextUser = await refreshSession();
      if (cancelled) {
        return;
      }
      setUser(nextUser);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [applyOauthTokens]);

  useEffect(() => {
    return subscribeSessionCleared(() => {
      setUser(null);
    });
  }, []);

  const signIn = useCallback(async (payload: AuthPayload) => {
    rememberAccessToken(payload.accessToken);
    await writeRefreshToken(payload.refreshToken);
    await apolloClient.clearStore();
    setUser(payload.user);
  }, []);

  const signOut = useCallback(async () => {
    const refreshToken = await readRefreshToken();
    try {
      await apolloClient.mutate({
        mutation: LogoutDocument,
        variables: {
          input: refreshToken ? { refreshToken } : {},
        },
        context: { skipAuthRefresh: true },
      });
    } catch {
      // Локальная сессия всё равно завершается.
    }
    await clearSession();
    await apolloClient.clearStore();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      user,
      signIn,
      applyOauthTokens,
      signOut,
    }),
    [applyOauthTokens, ready, signIn, signOut, user],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession используется вне SessionProvider');
  }
  return value;
}
