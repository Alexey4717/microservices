'use client';

import { useState } from 'react';

type ChatComposerProps = {
  variant: 'page' | 'panel';
  streaming: boolean;
  creating: boolean;
  onSend: (content: string, temperature: number) => Promise<boolean>;
};

export function ChatComposer({
  variant,
  streaming,
  creating,
  onSend,
}: ChatComposerProps) {
  const [draft, setDraft] = useState('');
  const [temperature, setTemperature] = useState(0.2);

  async function sendMessage() {
    const content = draft.trim();
    if (!content || creating || streaming) {
      return;
    }

    setDraft('');
    const accepted = await onSend(content, temperature);
    if (!accepted) {
      setDraft(content);
    }
  }

  return (
    <form
      className="flex shrink-0 flex-col gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
      aria-busy={streaming || creating || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        void sendMessage();
      }}
    >
      <label className="flex items-center gap-2 text-xs text-zinc-500">
        Температура
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={temperature}
          aria-label="Температура ответа"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={temperature}
          className="w-28 accent-zinc-900 dark:accent-zinc-100"
          onChange={(event) => setTemperature(Number(event.target.value))}
        />
        <span className="tabular-nums">{temperature.toFixed(1)}</span>
      </label>
      <div className="flex gap-2">
        <textarea
          className={
            variant === 'panel'
              ? 'max-h-24 min-h-10 flex-1 resize-none rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:focus-visible:ring-zinc-100'
              : 'min-h-12 flex-1 resize-y rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:focus-visible:ring-zinc-100'
          }
          placeholder="Сообщение"
          value={draft}
          rows={2}
          disabled={streaming || creating}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void sendMessage();
            }
          }}
        />
        <button
          type="submit"
          className="self-end rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          disabled={streaming || creating || draft.trim().length === 0}
        >
          {streaming || creating ? 'Отправка…' : 'Отправить'}
        </button>
      </div>
    </form>
  );
}
