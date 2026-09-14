import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { AvatarUpload } from '@/app/(app)/profile/avatar-upload';
import { query } from '@/lib/apollo/server';
import { isPrefetchRequest } from '@/lib/auth/request-kind';
import { getSession } from '@/lib/auth/session';
import { ME_QUERY } from '@/lib/graphql/documents';
import type { AuthUser } from '@/lib/graphql/types';

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    if (isPrefetchRequest(await headers())) {
      return null;
    }
    redirect('/login');
  }

  let me = session.user;
  try {
    const result = await query<{ me: AuthUser }>({ query: ME_QUERY });
    if (result.data?.me) {
      me = result.data.me;
    }
  } catch {
    // Keep the user from refresh if Me is briefly unavailable.
  }

  return (
    <section className="flex max-w-lg flex-col gap-4">
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
            <dt className="text-zinc-500">ID</dt>
            <dd className="min-w-0 break-all font-mono text-xs">{me.id}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
