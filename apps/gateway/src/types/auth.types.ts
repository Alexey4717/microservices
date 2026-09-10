export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

export interface OauthProfile {
  provider: 'google' | 'github';
  providerAccountId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
