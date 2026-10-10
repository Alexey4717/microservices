import type { AuthUser } from '@/lib/auth/auth-user';

import { UserAvatar } from '../user-avatar';

type TelegramProfile = NonNullable<AuthUser['telegram']>;

export function LinkedTelegramCard({
  telegram,
}: {
  telegram: TelegramProfile;
}) {
  const handle = telegram.username?.replace(/^@/, '').trim() || '';
  const fullName = [telegram.firstName, telegram.userLastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ');
  const title = fullName || (handle ? `@${handle}` : 'Telegram');
  const alt = fullName || (handle ? `@${handle}` : 'Telegram');

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">Telegram</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Telegram уже привязан к аккаунту.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <UserAvatar src={telegram.photoUrl} alt={alt} size={56} name={title} />
        <div className="min-w-0">
          <p className="truncate font-medium">{title}</p>
          {handle && fullName ? (
            <p className="truncate text-zinc-500 dark:text-zinc-400">
              @{handle}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
