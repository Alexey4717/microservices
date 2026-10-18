import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { apolloClient } from './apollo';
import {
  clearAccessToken,
  clearSession,
  rememberSession,
  type SessionTokens,
} from './auth-session';
import { restoreSession, type RestoreResult } from './restore-session';
import { SessionContext, type SessionValue } from './session-context';
import styles from './session.module.scss';

type SessionPhase = { status: 'restoring' } | RestoreResult;

type SessionProviderProps = {
  children: ReactNode;
};

export function SessionProvider({ children }: SessionProviderProps) {
  const [phase, setPhase] = useState<SessionPhase>({ status: 'restoring' });

  useEffect(() => {
    let cancelled = false;
    void restoreSession().then((result) => {
      if (!cancelled) {
        setPhase(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (tokens: SessionTokens) => {
    await rememberSession(tokens);
    setPhase({ status: 'authenticated' });
  }, []);

  const signOut = useCallback(async () => {
    try {
      await clearSession();
    } catch {
      clearAccessToken();
    }
    await apolloClient.clearStore().catch(() => undefined);
    setPhase({ status: 'anonymous', notice: null });
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      status: phase.status === 'authenticated' ? 'authenticated' : 'anonymous',
      notice: phase.status === 'anonymous' ? phase.notice : null,
      signIn,
      signOut,
    }),
    [phase, signIn, signOut],
  );

  if (phase.status === 'restoring') {
    return <p className={styles.status}>Проверка сессии…</p>;
  }

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
