'use client';

import { useId, useState } from 'react';

import { createCheckout, isCheckoutConflict } from '@/lib/graphql/checkout';
import {
  type AuthUser,
  type PaymentProvider,
  toAccountTier,
} from '@/lib/graphql/types';

type PremiumCheckoutProps = {
  accessToken: string;
  user: AuthUser;
};

const PREMIUM_PRICE_LABEL = '9,99\u00a0USD';

export function PremiumCheckout({ accessToken, user }: PremiumCheckoutProps) {
  const statusId = useId();
  const errorId = useId();
  const [pendingProvider, setPendingProvider] =
    useState<PaymentProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);

  const accountTier = toAccountTier(user.accountTier);
  const isPremium = accountTier === 'PREMIUM';
  const hideBuyButtons = isPremium || alreadyPurchased;
  const requesting = pendingProvider !== null;

  async function onPay(provider: PaymentProvider) {
    if (requesting) {
      return;
    }

    setError(null);
    setPendingProvider(provider);

    try {
      const payload = await createCheckout({ provider, accessToken });
      window.location.assign(payload.checkoutUrl);
    } catch (checkoutError) {
      if (isCheckoutConflict(checkoutError)) {
        setAlreadyPurchased(true);
        setError(
          checkoutError instanceof Error
            ? checkoutError.message
            : 'PREMIUM уже куплен',
        );
        return;
      }

      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : 'Не удалось создать оплату. Попробуйте ещё раз.',
      );
    } finally {
      setPendingProvider(null);
    }
  }

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-900"
      aria-busy={requesting || undefined}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">PREMIUM</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Разовая покупка доступа. Стоимость {PREMIUM_PRICE_LABEL}.
        </p>
      </div>

      {isPremium ? (
        <p>
          <span className="inline-flex rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-white dark:bg-zinc-100 dark:text-zinc-900">
            PREMIUM
          </span>
        </p>
      ) : null}

      {alreadyPurchased && !isPremium ? (
        <p className="text-zinc-600 dark:text-zinc-400" aria-live="polite">
          PREMIUM уже куплен
        </p>
      ) : null}

      {hideBuyButtons ? null : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={requesting}
            onClick={() => {
              void onPay('STRIPE');
            }}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:focus-visible:ring-zinc-100"
          >
            {pendingProvider === 'STRIPE'
              ? 'Переходим к оплате…'
              : 'Оплатить картой (Stripe)'}
          </button>
          <button
            type="button"
            disabled={requesting}
            onClick={() => {
              void onPay('PAYPAL');
            }}
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-100"
          >
            {pendingProvider === 'PAYPAL' ? 'Переходим к оплате…' : 'PayPal'}
          </button>
        </div>
      )}

      {requesting ? (
        <p
          id={statusId}
          className="text-zinc-600 dark:text-zinc-400"
          aria-live="polite"
        >
          Переходим к оплате…
        </p>
      ) : null}

      {error && !alreadyPurchased ? (
        <p
          id={errorId}
          className="text-sm text-red-600 dark:text-red-400"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
