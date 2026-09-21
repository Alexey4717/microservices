export interface TelegramProfile {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  photoUrl: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  accountTier: string;
  telegram?: TelegramProfile;
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

export interface LoginWithTelegramRequest {
  initData: string;
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

export interface GetMeByTelegramRequest {
  telegramId: string;
}

export type CreateTelegramLinkTokenRequest = Record<string, never>;

export interface CreateTelegramLinkTokenResponse {
  token: string;
}

export interface ConsumeTelegramLinkTokenRequest {
  telegramId: string;
  token: string;
}

export interface UpsertTelegramProfileRequest {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
}

export type Empty = Record<string, never>;
