import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';

import type { GetMeByTelegramRequest, UserResponse } from '@libs/proto';

import {
  TELEGRAM_OAUTH_PROVIDER,
  telegramUserInclude,
  toUserResponse,
} from '../helpers/auth-user-response';
import { PrismaService } from './prisma.service';

@Injectable()
export class GetMeByTelegramUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(data: GetMeByTelegramRequest): Promise<UserResponse> {
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
      include: {
        user: { include: telegramUserInclude },
      },
    });

    if (!account) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Telegram is not linked',
      });
    }

    return toUserResponse(account.user);
  }
}
