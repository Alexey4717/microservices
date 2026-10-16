import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';

import type { AuthResponse, RefreshRequest } from '@libs/proto';

import { hashToken } from '../helpers/auth-tokens';
import { toUserResponse } from '../helpers/auth-user-response';
import { AuthSupportHelper } from './auth-support.helper';
import { PrismaService } from './prisma.service';

@Injectable()
export class RefreshTokensUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authSupport: AuthSupportHelper,
  ) {}

  async execute(data: RefreshRequest): Promise<AuthResponse> {
    const refreshToken = data.refreshToken?.trim();
    if (!refreshToken) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Refresh token is required',
      });
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt.getTime() <= Date.now()
    ) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Invalid refresh token',
      });
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.authSupport.issueTokens(
      stored.user.id,
      stored.user.email,
    );
    return { ...tokens, user: toUserResponse(stored.user) };
  }
}
