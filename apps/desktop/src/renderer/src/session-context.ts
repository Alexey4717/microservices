import { createContext, useContext } from 'react';

import type { SessionTokens } from './auth-session';

export type SessionValue = {
  status: 'anonymous' | 'authenticated';
  notice: string | null;
  signIn: (tokens: SessionTokens) => Promise<void>;
  signOut: () => Promise<void>;
};

export const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('Сессия ещё не готова');
  }
  return value;
}
