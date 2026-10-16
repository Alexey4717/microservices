import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';

import type {
  ConsumeTelegramLinkTokenRequest,
  UserResponse,
} from '@libs/proto';

import { hashToken } from '../helpers/auth-tokens';
import {
  TELEGRAM_OAUTH_PROVIDER,
  telegramProfileStub,
} from '../helpers/auth-user-response';
import { AuthSupportHelper } from './auth-support.helper';
import { PrismaService } from './prisma.service';

@Injectable()
export class ConsumeTelegramLinkTokenUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authSupport: AuthSupportHelper,
  ) {}

  async execute(data: ConsumeTelegramLinkTokenRequest): Promise<UserResponse> {
    const telegramId = data.telegramId?.trim();
    const token = data.token?.trim();
    if (!telegramId || !token) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'telegram_id and token are required',
      });
    }

    const stored = await this.prisma.telegramLinkToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });

    if (!stored || stored.expiresAt.getTime() <= Date.now()) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Invalid or expired link token',
      });
    }

    const existingAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: TELEGRAM_OAUTH_PROVIDER,
          providerAccountId: telegramId,
        },
      },
    });

    if (existingAccount) {
      if (existingAccount.userId !== stored.userId) {
        throw new RpcException({
          code: status.ALREADY_EXISTS,
          message: 'Telegram is already linked to another user',
        });
      }

      await this.prisma.$transaction([
        this.prisma.telegramLinkToken.delete({
          where: { id: stored.id },
        }),
        this.prisma.telegramProfile.upsert(
          telegramProfileStub(stored.userId, telegramId),
        ),
      ]);

      this.authSupport.emitTelegramUpdated(stored.userId);
      return this.authSupport.userResponseById(stored.userId);
    }

    if (stored.usedAt) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Invalid or expired link token',
      });
    }

    await this.prisma.$transaction([
      this.prisma.oAuthAccount.create({
        data: {
          userId: stored.userId,
          provider: TELEGRAM_OAUTH_PROVIDER,
          providerAccountId: telegramId,
        },
      }),
      this.prisma.telegramProfile.upsert(
        telegramProfileStub(stored.userId, telegramId),
      ),
      this.prisma.telegramLinkToken.delete({
        where: { id: stored.id },
      }),
    ]);

    this.authSupport.emitTelegramUpdated(stored.userId);
    return this.authSupport.userResponseById(stored.userId);
  }
}
