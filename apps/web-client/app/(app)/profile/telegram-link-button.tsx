'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

import { createTelegramLink } from '@/lib/graphql/telegram-link';
import { subscribeTelegramLinked } from '@/lib/graphql/telegram-linked';
import type { TelegramProfile } from '@/lib/graphql/types';

import { UserAvatar } from '../user-avatar';

const TELEGRAM_LINK_TTL_MINUTES = 10;

const TELEGRAM_LINK_HINT = `Ссылка привязки действует ${TELEGRAM_LINK_TTL_MINUTES} минут. Если не успели нажать Start в Telegram, создайте новую в профиле. При повторном нажатии прежняя ссылка становится недействительной.`;

type TelegramLinkButtonProps = {
  accessToken: string;
  telegram?: TelegramProfile | null;
};

export function TelegramLinkButton({
  accessToken,
  telegram,
}: TelegramLinkButtonProps) {
  const linked = Boolean(telegram?.userId?.trim());

  if (linked && telegram) {
    return <LinkedTelegramCard telegram={telegram} />;
  }

  return <BindTelegramCard accessToken={accessToken} />;
}

function LinkedTelegramCard({ telegram }: { telegram: TelegramProfile }) {
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

function BindTelegramCard({ accessToken }: { accessToken: string }) {
  const router = useRouter();
  const statusId = useId();
  const errorId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeTelegramLinked(accessToken, () => {
      router.refresh();
    });
  }, [accessToken, router]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    }

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [router]);

  async function onLink() {
    if (pending) {
      return;
    }

    setError(null);
    setPending(true);

    try {
      const payload = await createTelegramLink({ accessToken });
      window.open(payload.url, '_blank', 'noopener,noreferrer');
    } catch (linkError) {
      setError(
        linkError instanceof Error
          ? linkError.message
          : 'Не удалось создать ссылку Telegram. Попробуйте ещё раз.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-900"
      aria-busy={pending || undefined}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Telegram</h2>
          <TelegramLinkHint />
        </div>
        <p className="text-zinc-600 dark:text-zinc-400">
          Привяжите бота к аккаунту. Ссылка откроется в клиенте Telegram.
        </p>
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          void onLink();
        }}
        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:focus-visible:ring-zinc-100"
      >
        {pending ? 'Открываем Telegram…' : 'Привязать Telegram'}
      </button>

      {pending ? (
        <p
          id={statusId}
          className="text-zinc-600 dark:text-zinc-400"
          aria-live="polite"
        >
          Открываем Telegram…
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          className="text-sm text-red-600 dark:text-red-400"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function TelegramLinkHint() {
  const tooltipId = useId();

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-describedby={tooltipId}
        aria-label="Как действует ссылка привязки Telegram"
        className="peer inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-300 text-[11px] font-semibold leading-none text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200 dark:focus-visible:ring-zinc-100"
      >
        ?
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute top-full left-0 z-20 mt-2 w-72 rounded-lg border border-zinc-200 bg-white p-3 text-left text-xs font-normal leading-relaxed text-zinc-600 opacity-0 shadow-lg transition-opacity peer-hover:opacity-100 peer-focus:opacity-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      >
        {TELEGRAM_LINK_HINT}
      </span>
    </span>
  );
}
