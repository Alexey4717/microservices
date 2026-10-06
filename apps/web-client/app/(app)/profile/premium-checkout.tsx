'use client';

import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useMutation } from '@apollo/client/react';
import { useId } from 'react';

import { CreateCheckoutDocument } from '@libs/graphql/operations/payments/create-checkout.generated';

import { type AuthUser, toAccountTier } from '@/lib/auth/auth-user';
import type { PaymentProvider } from '@/lib/graphql/payment-model';

type PremiumCheckoutProps = {
  user: AuthUser;
};

const PREMIUM_PRICE_LABEL = '9,99\u00a0USD';

export function PremiumCheckout({ user }: PremiumCheckoutProps) {
  const statusId = useId();
  const errorId = useId();
  const [payWithStripe, stripe] = useMutation(CreateCheckoutDocument);
  const [payWithPaypal, paypal] = useMutation(CreateCheckoutDocument);

  const accountTier = toAccountTier(user.accountTier);
  const isPremium = accountTier === 'PREMIUM';
  const hookError = stripe.error ?? paypal.error;
  const alreadyPurchased = isPremiumConflict(hookError);
  const hideBuyButtons = isPremium || alreadyPurchased;
  const requesting = stripe.loading || paypal.loading;

  async function onPay(provider: PaymentProvider) {
    if (requesting) {
      return;
    }

    const pay = provider === 'STRIPE' ? payWithStripe : payWithPaypal;
    const result = await pay({
      variables: { input: { provider } },
    }).catch(() => null);
    const checkoutUrl = result?.data?.createCheckout?.checkoutUrl;
    if (checkoutUrl) {
      window.location.assign(checkoutUrl);
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
            {stripe.loading
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
            {paypal.loading ? 'Переходим к оплате…' : 'PayPal'}
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
    </div>
  );
}

function isPremiumConflict(error: unknown): boolean {
  if (!error) {
    return false;
  }
  if (CombinedGraphQLErrors.is(error)) {
    const graphQLError = error.errors[0];
    const code = graphQLError?.extensions?.code;
    const http = graphQLError?.extensions?.http;
    const status =
      typeof http === 'object' && http && 'status' in http
        ? http.status
        : undefined;
    if (code === 'CONFLICT' || status === 409) {
      return true;
    }
  }
  const message = error instanceof Error ? error.message : '';
  return /already purchased/i.test(message);
}
