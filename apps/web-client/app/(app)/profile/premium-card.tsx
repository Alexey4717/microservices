import type { ReactNode } from 'react';

const PREMIUM_PRICE_LABEL = '9,99\u00a0USD';

type PremiumCardProps = {
  busy?: boolean;
  children: ReactNode;
};

export function PremiumCard({ busy, children }: PremiumCardProps) {
  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-900"
      aria-busy={busy || undefined}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">PREMIUM</h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Разовая покупка доступа. Стоимость {PREMIUM_PRICE_LABEL}.
        </p>
      </div>
      {children}
    </div>
  );
}
