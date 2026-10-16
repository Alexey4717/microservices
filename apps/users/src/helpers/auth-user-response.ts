import type { UserResponse } from '@libs/proto';

export const TELEGRAM_OAUTH_PROVIDER = 'telegram';
export const TELEGRAM_LINK_TOKEN_TTL_MS = 10 * 60 * 1000;
export const BCRYPT_ROUNDS = 10;

export const telegramUserInclude = {
  telegramProfile: true,
  oauthAccounts: {
    where: { provider: TELEGRAM_OAUTH_PROVIDER },
    take: 1,
  },
} as const;

export function telegramProfileStub(userId: string, telegramUserId: string) {
  return {
    where: { userId },
    create: { userId, telegramUserId },
    update: { telegramUserId },
  };
}

type TelegramProfileRecord = {
  telegramUserId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
};

type TelegramOauthAccount = {
  provider: string;
  providerAccountId: string;
};

export function toUserResponse(user: {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  accountTier?: string | null;
  telegramProfile?: TelegramProfileRecord | null;
  oauthAccounts?: TelegramOauthAccount[];
}): UserResponse {
  const telegram = toTelegramResponse(user);
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? '',
    avatarUrl: user.avatarUrl ?? '',
    accountTier: user.accountTier || 'BASE',
    ...(telegram ? { telegram } : {}),
  };
}

function toTelegramResponse(user: {
  telegramProfile?: TelegramProfileRecord | null;
  oauthAccounts?: TelegramOauthAccount[];
}): UserResponse['telegram'] | undefined {
  if (user.telegramProfile) {
    return {
      userId: user.telegramProfile.telegramUserId,
      username: user.telegramProfile.username ?? '',
      firstName: user.telegramProfile.firstName ?? '',
      lastName: user.telegramProfile.lastName ?? '',
      photoUrl: user.telegramProfile.photoUrl ?? '',
    };
  }

  const oauth = user.oauthAccounts?.find(
    (account) => account.provider === TELEGRAM_OAUTH_PROVIDER,
  );
  if (!oauth) {
    return undefined;
  }

  return {
    userId: oauth.providerAccountId,
    username: '',
    firstName: '',
    lastName: '',
    photoUrl: '',
  };
}

export function sanitizePhotoUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  if (host === 'api.telegram.org' || host.endsWith('.telegram.org')) {
    return null;
  }
  if (parsed.pathname.includes('/file/bot')) {
    return null;
  }

  return trimmed;
}
