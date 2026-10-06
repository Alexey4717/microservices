import { type AuthUser, toAccountTier } from '@/lib/auth/auth-user';

export function encodeSessionUser(user: AuthUser): string {
  return encodeURIComponent(
    JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      avatarUrl: user.avatarUrl ?? null,
      accountTier: toAccountTier(user.accountTier),
      telegram: toSessionTelegram(user.telegram),
    }),
  );
}

export function decodeSessionUser(value: string): AuthUser | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<AuthUser>;
    if (!parsed.id || !parsed.email) {
      return null;
    }

    return {
      id: parsed.id,
      email: parsed.email,
      name: parsed.name ?? null,
      avatarUrl: parsed.avatarUrl ?? null,
      accountTier: toAccountTier(parsed.accountTier),
      telegram: toSessionTelegram(parsed.telegram),
    };
  } catch {
    return null;
  }
}

function toSessionTelegram(value: unknown): AuthUser['telegram'] {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const telegram = value as Partial<NonNullable<AuthUser['telegram']>>;
  if (typeof telegram.userId !== 'string') {
    return null;
  }

  return {
    userId: telegram.userId,
    username: typeof telegram.username === 'string' ? telegram.username : null,
    firstName:
      typeof telegram.firstName === 'string' ? telegram.firstName : null,
    userLastName:
      typeof telegram.userLastName === 'string' ? telegram.userLastName : null,
    photoUrl: typeof telegram.photoUrl === 'string' ? telegram.photoUrl : null,
  };
}

export function sessionDisplayName(user: AuthUser): string {
  const name = user.name?.trim();
  return name || user.email;
}
