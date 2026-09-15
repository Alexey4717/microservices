'use client';

import { useEffect, useRef } from 'react';

import { completeOauthCallback } from '@/lib/auth/actions';

export function OauthCallbackClient() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const refreshToken = new URLSearchParams(hash).get('refreshToken') ?? '';

    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}`,
    );

    void completeOauthCallback(refreshToken);
  }, []);

  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-400">Завершаем вход…</p>
  );
}
