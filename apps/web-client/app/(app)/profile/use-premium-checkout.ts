'use client';

import { useMutation } from '@apollo/client/react';
import { useId } from 'react';

import { CreateCheckoutDocument } from '@libs/graphql/operations/payments/create-checkout.generated';

import type { PaymentProvider } from '@/lib/graphql/payment-model';

import { isPremiumConflict } from './is-premium-conflict';

export function usePremiumCheckout() {
  const statusId = useId();
  const errorId = useId();
  const [payWithStripe, stripe] = useMutation(CreateCheckoutDocument);
  const [payWithPaypal, paypal] = useMutation(CreateCheckoutDocument);

  const hookError = stripe.error ?? paypal.error;
  const alreadyPurchased = isPremiumConflict(hookError);
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

  return {
    statusId,
    errorId,
    stripeLoading: stripe.loading,
    paypalLoading: paypal.loading,
    hookError,
    alreadyPurchased,
    requesting,
    onPay,
  };
}
