'use client';

import { useApolloClient, useQuery } from '@apollo/client/react';
import Link from 'next/link';
import { useCallback, useId, useRef, useSyncExternalStore } from 'react';

import { GetPaymentDocument } from '@libs/graphql/operations/payments/get-payment.generated';

import type {
  PaymentModel,
  PaymentProvider,
  PaymentStatus,
} from '@/lib/graphql/payment-model';

type PaymentOrderProps = {
  payment: PaymentModel;
};

const FAST_POLL_MS = 2_000;
const SLOW_POLL_MS = 5_000;
const SLOW_AFTER_MS = 30_000;

const STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Ожидаем подтверждение оплаты…',
  SUCCEEDED: 'Оплата прошла',
  FAILED: 'Оплата не прошла',
  CANCELED: 'Оплата отменена',
};

const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  STRIPE: 'Stripe',
  PAYPAL: 'PayPal',
};

export function PaymentOrder({ payment: initialPayment }: PaymentOrderProps) {
  const statusId = useId();
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

  const payment = data?.payment ?? initialPayment;

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight text-pretty">
        Заказ
      </h1>
      <div className="grid gap-4 rounded-2xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <dl className="grid gap-3">
          <div>
            <dt className="text-zinc-500">Продукт</dt>
            <dd className="min-w-0 break-words font-medium">
              {payment.productCode}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Провайдер</dt>
            <dd className="min-w-0 font-medium">
              {PROVIDER_LABEL[payment.provider] ?? payment.provider}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Сумма</dt>
            <dd className="min-w-0 font-medium">
              {formatAmountMinor(payment.amountMinor, payment.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Создан</dt>
            <dd className="min-w-0">
              <time dateTime={payment.createdAt}>
                {formatPaymentDate(payment.createdAt)}
              </time>
            </dd>
          </div>
        </dl>
        <p
          id={statusId}
          className="font-medium text-zinc-900 dark:text-zinc-50"
          role="status"
          aria-live="polite"
        >
          {STATUS_LABEL[payment.status] ?? payment.status}
        </p>
        {payment.status === 'PENDING' && payment.checkoutUrl ? (
          <a
            href={payment.checkoutUrl}
            className="w-fit font-medium text-zinc-900 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:text-zinc-50 dark:focus-visible:ring-zinc-100"
          >
            Продолжить оплату
          </a>
        ) : null}
      </div>
      <Link
        href="/profile"
        prefetch={false}
        className="w-fit font-medium text-zinc-900 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:text-zinc-50 dark:focus-visible:ring-zinc-100"
      >
        Вернуться в профиль
      </Link>
    </section>
  );
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

function formatAmountMinor(amountMinor: number, currency: string): string {
  const major = amountMinor / 100;
  return `${major.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}\u00a0${currency}`;
}

function formatPaymentDate(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Date(parsed).toLocaleString('ru-RU');
}
