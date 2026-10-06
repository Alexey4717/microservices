import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { GetPaymentDocument } from '@libs/graphql/operations/payments/get-payment.generated';

import { query } from '@/lib/apollo/server';
import { isPrefetchRequest } from '@/lib/auth/request-kind';
import { getSession } from '@/lib/auth/session';

import { PaymentOrder } from './payment-order';

type PaymentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PaymentPage({ params }: PaymentPageProps) {
  const session = await getSession();
  if (!session) {
    if (isPrefetchRequest(await headers())) {
      return null;
    }
    redirect('/login');
  }

  const { id } = await params;
  const result = await query({
    query: GetPaymentDocument,
    variables: { id },
  }).catch(() => null);

  const payment = result?.data?.payment;
  if (!payment) {
    return <PaymentNotFound />;
  }

  return <PaymentOrder payment={payment} />;
}

function PaymentNotFound() {
  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight text-pretty">
        Заказ
      </h1>
      <p className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
        Платёж не найден
      </p>
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
