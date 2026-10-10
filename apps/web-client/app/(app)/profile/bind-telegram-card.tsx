'use client';

import { useId } from 'react';

import { TelegramLinkHint } from './telegram-link-hint';
import { useBindTelegram } from './use-bind-telegram';

export function BindTelegramCard() {
  const statusId = useId();
  const errorId = useId();
  const { loading, error, onLink } = useBindTelegram();

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-900"
      aria-busy={loading || undefined}
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
        disabled={loading}
        onClick={() => {
          void onLink();
        }}
        className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:focus-visible:ring-zinc-100"
      >
        {loading ? 'Открываем Telegram…' : 'Привязать Telegram'}
      </button>

      {loading ? (
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
          {error.message ||
            'Не удалось создать ссылку Telegram. Попробуйте ещё раз.'}
        </p>
      ) : null}
    </div>
  );
}
