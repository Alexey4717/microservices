export interface UserResponse {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  accountTier: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface OauthUpsertRequest {
  provider: string;
  providerAccountId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export type GetMeRequest = Record<string, never>;

export interface UpdateMeRequest {
  name?: string;
  avatarUrl?: string;
}

export type Empty = Record<string, never>;
