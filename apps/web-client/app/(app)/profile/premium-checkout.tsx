'use client';

import { type AuthUser, toAccountTier } from '@/lib/auth/auth-user';

import { PremiumCard } from './premium-card';
import { PremiumPurchase } from './premium-purchase';

type PremiumCheckoutProps = {
  user: AuthUser;
};

export function PremiumCheckout({ user }: PremiumCheckoutProps) {
  const isPremium = toAccountTier(user.accountTier) === 'PREMIUM';

  if (isPremium) {
    return (
      <PremiumCard>
        <p>
          <span className="inline-flex rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-white dark:bg-zinc-100 dark:text-zinc-900">
            PREMIUM
          </span>
        </p>
      </PremiumCard>
    );
  }

  return <PremiumPurchase />;
}
