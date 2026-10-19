import type { DesktopSessionApi } from '../../shared/desktop-api';

function sessionBridge(): DesktopSessionApi {
  const session = window.desktop?.session;
  if (!session) {
    throw new Error('Мост сессии недоступен');
  }
  return session;
}

export async function getRefreshToken(): Promise<string | null> {
  const token: unknown = await sessionBridge().getRefreshToken();
  if (typeof token !== 'string' || token.trim().length === 0) {
    return null;
  }
  return token;
}

export function setRefreshToken(token: string): Promise<void> {
  if (token.trim().length === 0) {
    return Promise.reject(new Error('Пустой refresh token'));
  }
  return sessionBridge().setRefreshToken(token);
}

export function clearRefreshToken(): Promise<void> {
  return sessionBridge().clearRefreshToken();
}
