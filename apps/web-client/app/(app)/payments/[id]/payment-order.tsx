'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';

import { getPayment } from '@/lib/graphql/payment';
import type {
  PaymentModel,
  PaymentProvider,
  PaymentStatus,
} from '@/lib/graphql/types';

type PaymentOrderProps = {
  payment: PaymentModel;
  accessToken: string;
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

export function PaymentOrder({
  payment: initialPayment,
  accessToken,
}: PaymentOrderProps) {
  const statusId = useId();
  const [payment, setPayment] = useState(initialPayment);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (payment.status !== 'PENDING') {
      return;
    }

    startedAtRef.current ??= Date.now();
    let cancelled = false;
    let timer: number;

    const schedule = (delay: number) => {
      timer = window.setTimeout(() => {
        void poll();
      }, delay);
    };

    const poll = async () => {
      const next = await getPayment({ id: payment.id, accessToken });
      if (cancelled) {
        return;
      }
      if (next) {
        setPayment(next);
        if (next.status !== 'PENDING') {
          return;
        }
      }
      const startedAt = startedAtRef.current ?? Date.now();
      const elapsed = Date.now() - startedAt;
      schedule(elapsed >= SLOW_AFTER_MS ? SLOW_POLL_MS : FAST_POLL_MS);
    };

    schedule(FAST_POLL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [accessToken, payment.id, payment.status]);

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
