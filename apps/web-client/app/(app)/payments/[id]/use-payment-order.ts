'use client';

import { useApolloClient, useQuery } from '@apollo/client/react';
import { useCallback, useRef, useSyncExternalStore } from 'react';

import { GetPaymentDocument } from '@libs/graphql/operations/payments/get-payment.generated';

import {
  type PaymentModel,
  type PaymentStatus,
} from '@/lib/graphql/payment-model';

const FAST_POLL_MS = 2_000;
const SLOW_POLL_MS = 5_000;
const SLOW_AFTER_MS = 30_000;

export function usePaymentOrder(initialPayment: PaymentModel) {
  const client = useApolloClient();
  const slowPoll = useSlowPoll(initialPayment.status === 'PENDING');
  const status =
    readCachedPaymentStatus(client, initialPayment.id) ?? initialPayment.status;
  const pollInterval = pollIntervalFor(status, slowPoll);
  const { data } = useQuery(GetPaymentDocument, {
    variables: { id: initialPayment.id },
    skip: initialPayment.status !== 'PENDING',
    pollInterval,
    fetchPolicy: 'network-only',
  });

  return data?.payment ?? initialPayment;
}

function pollIntervalFor(status: PaymentStatus, slowPoll: boolean): number {
  if (status !== 'PENDING') {
    return 0;
  }
  return slowPoll ? SLOW_POLL_MS : FAST_POLL_MS;
}

function readCachedPaymentStatus(
  client: ReturnType<typeof useApolloClient>,
  id: string,
): PaymentStatus | null {
  // The cache is written before useQuery re-renders, so this status matches
  // the payment observed on the same render and can stop polling immediately.
  const cached = client.readQuery({
    query: GetPaymentDocument,
    variables: { id },
  });
  return cached?.payment.status ?? null;
}

function useSlowPoll(enabled: boolean): boolean {
  const clockRef = useRef({ startedAt: 0, slow: false });
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const clock = clockRef.current;
      if (!enabled || clock.slow) {
        return () => {};
      }
      if (clock.startedAt === 0) {
        clock.startedAt = Date.now();
      }
      const delay = Math.max(0, SLOW_AFTER_MS - (Date.now() - clock.startedAt));
      const timer = window.setTimeout(() => {
        clock.slow = true;
        onStoreChange();
      }, delay);
      return () => {
        window.clearTimeout(timer);
      };
    },
    [enabled],
  );

  return useSyncExternalStore(
    subscribe,
    () => enabled && clockRef.current.slow,
    () => false,
  );
}
