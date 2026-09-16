import Link from 'next/link';

import type { PaymentModel, PaymentStatus } from '@/lib/graphql/types';

type PaymentsListProps = {
  payments: PaymentModel[];
};

const STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Ожидает оплаты',
  SUCCEEDED: 'Оплачен',
  FAILED: 'Ошибка',
  CANCELED: 'Отменён',
};

const PROVIDER_LABEL = {
  STRIPE: 'Stripe',
  PAYPAL: 'PayPal',
} as const;

export function PaymentsList({ payments }: PaymentsListProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold tracking-tight">Платежи</h2>
      {payments.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">Платежей пока нет</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="flex flex-col gap-1 border-t border-zinc-200 pt-3 first:border-t-0 first:pt-0 dark:border-zinc-800"
            >
              <Link
                href={`/payments/${payment.id}`}
                prefetch={false}
                className="flex flex-col gap-1 rounded-lg hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">
                    {PROVIDER_LABEL[payment.provider] ?? payment.provider}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {formatAmountMinor(payment.amountMinor, payment.currency)}
                  </span>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-zinc-600 dark:text-zinc-400">
                  <span>{STATUS_LABEL[payment.status] ?? payment.status}</span>
                  <time dateTime={payment.createdAt}>
                    {formatPaymentDate(payment.createdAt)}
                  </time>
                </div>
              </Link>
              {payment.status === 'PENDING' && payment.checkoutUrl ? (
                <a
                  href={payment.checkoutUrl}
                  className="w-fit font-medium text-zinc-900 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:text-zinc-50 dark:focus-visible:ring-zinc-100"
                >
                  Продолжить оплату
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
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
