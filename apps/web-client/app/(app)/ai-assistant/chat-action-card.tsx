'use client';

import type { ChatAction } from './chat-model';

type ChatActionCardProps = {
  action: ChatAction;
  onConfirm: (action: ChatAction) => Promise<void>;
  onReject: (action: ChatAction) => Promise<void>;
};

export function ChatActionCard({
  action,
  onConfirm,
  onReject,
}: ChatActionCardProps) {
  return (
    <article className="max-w-[85%] rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950">
      <p className="font-medium">{action.title}</p>
      {action.status === 'pending' ? (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            disabled={action.busy}
            onClick={() => {
              void onConfirm(action);
            }}
          >
            {action.busy ? 'Подтверждаем…' : 'Подтвердить'}
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
            disabled={action.busy}
            onClick={() => {
              void onReject(action);
            }}
          >
            Отклонить
          </button>
        </div>
      ) : (
        <p className="mt-1 text-xs text-zinc-500">
          {action.status === 'confirmed' ? 'Подтверждено' : 'Отклонено'}
        </p>
      )}
      {action.error ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
          {action.error}
        </p>
      ) : null}
    </article>
  );
}
