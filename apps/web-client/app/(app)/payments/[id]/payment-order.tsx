'use client';

import Link from 'next/link';
import { useId } from 'react';

import {
  type PaymentModel,
  formatAmountMinor,
  formatPaymentDate,
  paymentOrderStatusLabel,
  paymentProviderLabel,
} from '@/lib/graphql/payment-model';

import { usePaymentOrder } from './use-payment-order';

type PaymentOrderProps = {
  payment: PaymentModel;
};

export function PaymentOrder({ payment: initialPayment }: PaymentOrderProps) {
  const statusId = useId();
  const payment = usePaymentOrder(initialPayment);

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
              {paymentProviderLabel[payment.provider] ?? payment.provider}
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
          {paymentOrderStatusLabel[payment.status] ?? payment.status}
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
