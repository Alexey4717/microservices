import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { Metadata, status } from '@grpc/grpc-js';
import { randomBytes } from 'node:crypto';

import { requireUserId } from '@libs/common';
import type {
  CreateTelegramLinkTokenRequest,
  CreateTelegramLinkTokenResponse,
} from '@libs/proto';

import { hashToken } from '../helpers/auth-tokens';
import { TELEGRAM_LINK_TOKEN_TTL_MS } from '../helpers/auth-user-response';
import { PrismaService } from './prisma.service';

@Injectable()
export class CreateTelegramLinkTokenUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    _data: CreateTelegramLinkTokenRequest,
    metadata: Metadata,
  ): Promise<CreateTelegramLinkTokenResponse> {
    const userId = requireUserId(metadata);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'User not found',
      });
    }

    const token = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      this.prisma.telegramLinkToken.deleteMany({ where: { userId } }),
      this.prisma.telegramLinkToken.create({
        data: {
          userId,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + TELEGRAM_LINK_TOKEN_TTL_MS),
        },
      }),
    ]);

    return { token };
  }
}
