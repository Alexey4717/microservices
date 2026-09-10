import type { AuthResponse, UserResponse } from '@libs/proto';

import { AuthPayload } from '../models/auth-payload.model';
import { UserModel } from '../models/user.model';

export function toUserModel(user: UserResponse): UserModel {
  return {
    id: user.id,
    email: user.email,
    name: user.name || undefined,
    avatarUrl: user.avatarUrl || undefined,
  };
}

export function toAuthPayload(result: AuthResponse): AuthPayload {
  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    user: toUserModel(result.user),
  };
}
