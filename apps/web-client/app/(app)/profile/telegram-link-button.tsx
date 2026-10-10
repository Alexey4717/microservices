'use client';

import type { AuthUser } from '@/lib/auth/auth-user';

import { BindTelegramCard } from './bind-telegram-card';
import { LinkedTelegramCard } from './linked-telegram-card';

type TelegramLinkButtonProps = {
  telegram?: AuthUser['telegram'];
};

export function TelegramLinkButton({ telegram }: TelegramLinkButtonProps) {
  const linked = Boolean(telegram?.userId?.trim());

  if (linked && telegram) {
    return <LinkedTelegramCard telegram={telegram} />;
  }

  return <BindTelegramCard />;
}
