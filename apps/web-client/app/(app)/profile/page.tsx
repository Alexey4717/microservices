import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { AvatarUpload } from '@/app/(app)/profile/avatar-upload';
import { PaymentsList } from '@/app/(app)/profile/payments-list';
import { PremiumCheckout } from '@/app/(app)/profile/premium-checkout';
import { query } from '@/lib/apollo/server';
import { rememberSessionUser } from '@/lib/auth/actions';
import { isPrefetchRequest } from '@/lib/auth/request-kind';
import { getSession } from '@/lib/auth/session';
import { ME_QUERY, MY_PAYMENTS_QUERY } from '@/lib/graphql/documents';
import {
  type AuthUser,
  type PaymentModel,
  toAccountTier,
} from '@/lib/graphql/types';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    if (isPrefetchRequest(await headers())) {
      return null;
    }
    redirect('/login');
  }

  const [meResult, paymentsResult] = await Promise.all([
    query<{ me: AuthUser }>({ query: ME_QUERY }).catch(() => null),
    query<{ myPayments: PaymentModel[] }>({
      query: MY_PAYMENTS_QUERY,
    }).catch(() => null),
  ]);

  let me = session.user;
  if (meResult?.data?.me) {
    me = {
      ...meResult.data.me,
      accountTier: toAccountTier(meResult.data.me.accountTier),
    };
  } else {
    me = { ...me, accountTier: toAccountTier(me.accountTier) };
  }

  const payments = paymentsResult?.data?.myPayments ?? [];

  if (
    me.accountTier === 'PREMIUM' &&
    toAccountTier(session.user.accountTier) !== 'PREMIUM'
  ) {
    await rememberSessionUser(me);
  }

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight text-pretty">
        Профиль
      </h1>
      <div className="grid gap-6 rounded-2xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <AvatarUpload accessToken={session.accessToken} user={me} />
        <dl className="grid gap-3">
          <div>
            <dt className="text-zinc-500">Email</dt>
            <dd className="min-w-0 break-words font-medium">{me.email}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Имя</dt>
            <dd className="min-w-0 break-words font-medium">
              {me.name || 'Не указано'}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Тариф</dt>
            <dd className="min-w-0 font-medium">
              {me.accountTier === 'PREMIUM' ? 'PREMIUM' : 'Базовый'}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">ID</dt>
            <dd className="min-w-0 break-all font-mono text-xs">{me.id}</dd>
          </div>
        </dl>
      </div>
      <PremiumCheckout accessToken={session.accessToken} user={me} />
      <PaymentsList payments={payments} />
    </section>
  );
}
