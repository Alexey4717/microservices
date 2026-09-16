'use client';

import Link from 'next/link';

import { UserAvatar } from '@/app/(app)/user-avatar';
import { useClientUser } from '@/lib/auth/client-user';
import { sessionDisplayName } from '@/lib/auth/session-user';
import { type AuthUser, toAccountTier } from '@/lib/graphql/types';

type HeaderUserProps = {
  user: AuthUser;
};

export function HeaderUser({ user }: HeaderUserProps) {
  const current = useClientUser(user);
  const displayName = sessionDisplayName(current);

  return (
    <Link
      href="/profile"
      prefetch={false}
      className="flex min-w-0 items-center gap-2 rounded-lg hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
    >
      <UserAvatar
        src={current.avatarUrl}
        alt={`Аватар ${displayName}`}
        size={32}
        name={displayName}
        priority
      />
      <span className="flex min-w-0 items-center gap-2">
        <span
          className="max-w-[12rem] truncate text-sm text-zinc-600 dark:text-zinc-400"
          title={displayName}
        >
          {displayName}
        </span>
        {toAccountTier(current.accountTier) === 'PREMIUM' ? (
          <span className="shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white dark:bg-zinc-100 dark:text-zinc-900">
            PREMIUM
          </span>
        ) : null}
      </span>
    </Link>
  );
}
