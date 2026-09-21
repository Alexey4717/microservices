let accessToken = '';

export function rememberAccessToken(token: string): void {
  accessToken = token;
}

export function readAccessToken(): string {
  return accessToken;
}
