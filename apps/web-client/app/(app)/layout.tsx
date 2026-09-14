import Link from 'next/link';
import { type ReactNode, Suspense } from 'react';

import { logoutAction } from '@/lib/auth/actions';
import { getSession, sessionDisplayName } from '@/lib/auth/session';

import { HeaderUser } from './header-user';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link className="hover:underline" href="/" prefetch={false}>
              Главная
            </Link>
            <Link className="hover:underline" href="/videos" prefetch={false}>
              Видео
            </Link>
            <Link className="hover:underline" href="/profile" prefetch={false}>
              Профиль
            </Link>
          </nav>
          <Suspense fallback={<LogoutButton />}>
            <UserSessionMenu />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}

async function UserSessionMenu() {
  const session = await getSession();
  const displayName = session ? sessionDisplayName(session.user) : null;

  return (
    <div className="flex min-w-0 items-center gap-3">
      {displayName && session ? <HeaderUser user={session.user} /> : null}
      <LogoutButton />
    </div>
  );
}

function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Выйти
      </button>
    </form>
  );
}
