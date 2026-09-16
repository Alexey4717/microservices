'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';

import { rememberSessionUser } from '@/lib/auth/actions';
import { publishClientUser } from '@/lib/auth/client-user';
import {
  type AccountTier,
  type AuthUser,
  toAccountTier,
} from '@/lib/graphql/types';

type PaymentQuery = 'success' | 'cancel';

type PaymentReturnProps = {
  payment?: PaymentQuery;
  accountTier: AccountTier;
  user: AuthUser;
};

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 30_000;

export function PaymentReturn({
  payment,
  accountTier,
  user,
}: PaymentReturnProps) {
  const router = useRouter();
  const statusId = useId();
  const [returnKind] = useState<PaymentQuery | null>(() =>
    payment === 'success' || payment === 'cancel' ? payment : null,
  );
  const pollStartedAtRef = useRef<number | null>(null);
  const syncedPremium = useRef(false);
  const tier = toAccountTier(accountTier);
  const waitingForPremium = returnKind === 'success' && tier !== 'PREMIUM';

  useEffect(() => {
    if (payment !== 'success' && payment !== 'cancel') {
      return;
    }
    router.replace('/profile', { scroll: false });
  }, [payment, router]);

  useEffect(() => {
    if (
      returnKind !== 'success' ||
      tier !== 'PREMIUM' ||
      syncedPremium.current
    ) {
      return;
    }
    syncedPremium.current = true;
    publishClientUser(user);
    void rememberSessionUser(user);
  }, [returnKind, tier, user]);

  useEffect(() => {
    if (!waitingForPremium) {
      return;
    }

    pollStartedAtRef.current ??= Date.now();
    const startedAt = pollStartedAtRef.current;

    const timer = window.setInterval(() => {
      if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
        window.clearInterval(timer);
        return;
      }
      router.refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [waitingForPremium, router]);

  if (!returnKind) {
    return null;
  }

  const message =
    returnKind === 'cancel'
      ? 'Оплата отменена, можно попробовать снова'
      : tier === 'PREMIUM'
        ? 'PREMIUM активен'
        : 'Оплата принята, ждём подтверждение…';

  return (
    <p
      id={statusId}
      className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
      role="status"
      aria-live="polite"
    >
      {message}
    </p>
  );
}
