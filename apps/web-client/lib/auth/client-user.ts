'use client';

import { useEffect, useState } from 'react';

import type { AuthUser } from '@/lib/graphql/types';

type Listener = (user: AuthUser) => void;

const listeners = new Set<Listener>();

export function publishClientUser(user: AuthUser): void {
  for (const listener of listeners) {
    listener(user);
  }
}

export function useClientUser(initial: AuthUser): AuthUser {
  const [override, setOverride] = useState<AuthUser | null>(null);

  useEffect(() => {
    const listener: Listener = (next) => {
      if (next.id === initial.id) {
        setOverride(next);
      }
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [initial.id]);

  if (override?.id === initial.id) {
    return override;
  }

  return initial;
}
