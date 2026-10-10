'use client';

import { useId } from 'react';

import { TELEGRAM_LINK_HINT } from './telegram-link-copy';

export function TelegramLinkHint() {
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
