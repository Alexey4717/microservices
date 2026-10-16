import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';

import { emptyToNull } from '@libs/common';
import type { UpsertTelegramProfileRequest, UserResponse } from '@libs/proto';

import {
  TELEGRAM_OAUTH_PROVIDER,
  sanitizePhotoUrl,
} from '../helpers/auth-user-response';
import { hasOptionalStringField } from '../helpers/auth-validation';
import { AuthSupportHelper } from './auth-support.helper';
import { PrismaService } from './prisma.service';

@Injectable()
export class UpsertTelegramProfileUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authSupport: AuthSupportHelper,
  ) {}

  async execute(data: UpsertTelegramProfileRequest): Promise<UserResponse> {
    const telegramId = data.telegramId?.trim();
    if (!telegramId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'telegram_id is required',
      });
    }

    const account = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: TELEGRAM_OAUTH_PROVIDER,
          providerAccountId: telegramId,
        },
      },
    });

    if (!account) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Telegram is not linked',
      });
    }

    const photoSpecified = hasOptionalStringField(data, 'photoUrl');
    const photoUrl = photoSpecified
      ? sanitizePhotoUrl(data.photoUrl)
      : undefined;
    const usernameSpecified = hasOptionalStringField(data, 'username');
    const firstNameSpecified = hasOptionalStringField(data, 'firstName');
    const lastNameSpecified = hasOptionalStringField(data, 'lastName');

    await this.prisma.telegramProfile.upsert({
      where: { userId: account.userId },
      create: {
        userId: account.userId,
        telegramUserId: telegramId,
        username: emptyToNull(data.username),
        firstName: emptyToNull(data.firstName),
        lastName: emptyToNull(data.lastName),
        photoUrl: photoUrl ?? null,
      },
      update: {
        telegramUserId: telegramId,
        ...(usernameSpecified ? { username: emptyToNull(data.username) } : {}),
        ...(firstNameSpecified
          ? { firstName: emptyToNull(data.firstName) }
          : {}),
        ...(lastNameSpecified ? { lastName: emptyToNull(data.lastName) } : {}),
        ...(photoSpecified ? { photoUrl: photoUrl ?? null } : {}),
      },
    });

    this.authSupport.emitTelegramUpdated(account.userId);
    return this.authSupport.userResponseById(account.userId);
  }
}
