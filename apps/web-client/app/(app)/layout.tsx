import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { type ReactNode, Suspense } from 'react';

import { logoutAction } from '@/lib/auth/actions';
import { PATHNAME_HEADER } from '@/lib/auth/constants';
import { isPublicAppPath } from '@/lib/auth/public-paths';
import { isPrefetchRequest } from '@/lib/auth/request-kind';
import { getSession, sessionDisplayName } from '@/lib/auth/session';

import { AiAssistantWidget } from './ai-assistant-widget';
import { HeaderUser } from './header-user';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const headerStore = await headers();
  const pathname = headerStore.get(PATHNAME_HEADER) ?? '';

  if (!isPublicAppPath(pathname)) {
    const session = await getSession();
    if (!session) {
      if (isPrefetchRequest(headerStore)) {
        return null;
      }
      redirect('/login');
    }
  }

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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-24">
        {children}
      </main>
      <Suspense fallback={null}>
        <AiAssistantWidgetGate />
      </Suspense>
    </div>
  );
}

async function AiAssistantWidgetGate() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  return <AiAssistantWidget />;
}

async function UserSessionMenu() {
  const session = await getSession();
  if (!session) {
    return (
      <Link
        href="/login"
        prefetch={false}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Войти
      </Link>
    );
  }

  const displayName = sessionDisplayName(session.user);

  return (
    <div className="flex min-w-0 items-center gap-3">
      {displayName ? <HeaderUser user={session.user} /> : null}
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
