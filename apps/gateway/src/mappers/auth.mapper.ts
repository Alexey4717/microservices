import { emptyToUndefined } from '@libs/common';
import type { AuthResponse, TelegramProfile, UserResponse } from '@libs/proto';

import { AccountTier } from '../models/account-tier.enum';
import { AuthPayload } from '../models/auth-payload.model';
import { TelegramProfileModel } from '../models/telegram-profile.model';
import { UserModel } from '../models/user.model';

export function toUserModel(user: UserResponse): UserModel {
  return {
    id: user.id,
    email: user.email,
    name: user.name || undefined,
    avatarUrl: user.avatarUrl || undefined,
    accountTier: toAccountTier(user.accountTier),
    telegram: toTelegramProfileModel(user.telegram),
  };
}

export function toAuthPayload(result: AuthResponse): AuthPayload {
  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    user: toUserModel(result.user),
  };
}

function toTelegramProfileModel(
  profile: TelegramProfile | undefined,
): TelegramProfileModel | undefined {
  const userId = profile?.userId?.trim();
  if (!userId) {
    return undefined;
  }

  return {
    userId,
    username: emptyToUndefined(profile?.username),
    firstName: emptyToUndefined(profile?.firstName),
    userLastName: emptyToUndefined(profile?.lastName),
    photoUrl: emptyToUndefined(profile?.photoUrl),
  };
}

function toAccountTier(value: string | undefined): AccountTier {
  return value === AccountTier.PREMIUM ? AccountTier.PREMIUM : AccountTier.BASE;
}
