import type { AuthUser } from '@/lib/graphql/types';

export function encodeSessionUser(user: AuthUser): string {
  return encodeURIComponent(
    JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      avatarUrl: user.avatarUrl ?? null,
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
    };
  } catch {
    return null;
  }
}

export function sessionDisplayName(user: AuthUser): string {
  const name = user.name?.trim();
  return name || user.email;
}
