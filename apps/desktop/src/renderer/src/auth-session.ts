import { clearRefreshToken, setRefreshToken } from './desktop-session';

let accessToken = '';

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

export function rememberAccessToken(token: string): void {
  accessToken = token;
}

export function readAccessToken(): string {
  return accessToken;
}

export function clearAccessToken(): void {
  accessToken = '';
}

export async function rememberSession(tokens: SessionTokens): Promise<void> {
  await setRefreshToken(tokens.refreshToken);
  rememberAccessToken(tokens.accessToken);
}

export async function clearSession(): Promise<void> {
  clearAccessToken();
  await clearRefreshToken();
}
