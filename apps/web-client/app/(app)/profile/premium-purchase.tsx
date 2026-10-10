'use client';

import { PremiumCard } from './premium-card';
import { usePremiumCheckout } from './use-premium-checkout';

export function PremiumPurchase() {
  const {
    statusId,
    errorId,
    stripeLoading,
    paypalLoading,
    hookError,
    alreadyPurchased,
    requesting,
    onPay,
  } = usePremiumCheckout();

  return (
    <PremiumCard busy={requesting}>
      {alreadyPurchased ? (
        <p className="text-zinc-600 dark:text-zinc-400" aria-live="polite">
          PREMIUM уже куплен
        </p>
      ) : null}

      {alreadyPurchased ? null : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={requesting}
            onClick={() => {
              void onPay('STRIPE');
            }}
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:focus-visible:ring-zinc-100"
          >
            {stripeLoading ? 'Переходим к оплате…' : 'Оплатить картой (Stripe)'}
          </button>
          <button
            type="button"
            disabled={requesting}
            onClick={() => {
              void onPay('PAYPAL');
            }}
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-100"
          >
            {paypalLoading ? 'Переходим к оплате…' : 'PayPal'}
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

      {hookError && !alreadyPurchased ? (
        <p
          id={errorId}
          className="text-sm text-red-600 dark:text-red-400"
          role="alert"
          aria-live="polite"
        >
          {hookError.message ||
            'Не удалось создать оплату. Попробуйте ещё раз.'}
        </p>
      ) : null}
    </PremiumCard>
  );
}
