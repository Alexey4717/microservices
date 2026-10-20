'use client';

import { useState } from 'react';

import { pageChrome } from '@/lib/extension/chrome-runtime';
import { EXTENSION_ID } from '@/lib/extension/extension-id';

export function ExtensionPingButton() {
  const [reply, setReply] = useState<string | null>(null);

  function ping() {
    const runtime = pageChrome(window)?.runtime;
    if (!runtime?.sendMessage) {
      setReply('Расширение не установлено');
      return;
    }

    try {
      runtime.sendMessage(EXTENSION_ID, { type: 'ping' }, (response) => {
        if (runtime.lastError || !response?.text) {
          setReply('Расширение не установлено');
          return;
        }
        setReply(response.text);
      });
    } catch {
      setReply('Расширение не установлено');
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={ping}
        className="w-fit rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:focus-visible:ring-zinc-100"
      >
        Сообщить расширению
      </button>
      {reply ? (
        <p
          className="text-sm text-zinc-600 dark:text-zinc-400"
          aria-live="polite"
        >
          {reply}
        </p>
      ) : null}
    </div>
  );
}
