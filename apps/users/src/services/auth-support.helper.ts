import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy, RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';
import { randomBytes } from 'node:crypto';

import {
  USERS_RMQ_CLIENT,
  USER_EVENTS,
  type UserAuthenticatedEvent,
  type UserCreatedEvent,
  type UserTelegramUpdatedEvent,
  type UserUpdatedEvent,
} from '@libs/common';
import type { UserResponse } from '@libs/proto';

import { hashToken, parseTtlToMs } from '../helpers/auth-tokens';
import {
  telegramUserInclude,
  toUserResponse,
} from '../helpers/auth-user-response';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuthSupportHelper {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(USERS_RMQ_CLIENT) private readonly rmqClient: ClientProxy,
  ) {}

  async userResponseById(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: telegramUserInclude,
    });
    if (!user) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'User not found',
      });
    }
    return toUserResponse(user);
  }

  async issueTokens(
    userId: string,
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessTtl = this.configService.getOrThrow<string>('JWT_ACCESS_TTL');
    const refreshTtl = this.configService.getOrThrow<string>('JWT_REFRESH_TTL');

    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email },
      { expiresIn: accessTtl as `${number}${'s' | 'm' | 'h' | 'd'}` },
    );

    const refreshToken = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + parseTtlToMs(refreshTtl)),
      },
    });

    return { accessToken, refreshToken };
  }

  emitCreated(user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    accountTier?: string | null;
  }): void {
    const payload: UserCreatedEvent = {
      userId: user.id,
      email: user.email,
      name: user.name ?? '',
      avatarUrl: user.avatarUrl ?? '',
      accountTier: user.accountTier ?? 'BASE',
      occurredAt: new Date().toISOString(),
    };
    this.rmqClient.emit(USER_EVENTS.CREATED, payload);
  }

  emitUpdated(user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    accountTier?: string | null;
  }): void {
    const payload: UserUpdatedEvent = {
      userId: user.id,
      email: user.email,
      name: user.name ?? '',
      avatarUrl: user.avatarUrl ?? '',
      accountTier: user.accountTier ?? 'BASE',
      occurredAt: new Date().toISOString(),
    };
    this.rmqClient.emit(USER_EVENTS.UPDATED, payload);
  }

  emitTelegramUpdated(userId: string): void {
    const payload: UserTelegramUpdatedEvent = {
      userId,
      occurredAt: new Date().toISOString(),
    };
    this.rmqClient.emit(USER_EVENTS.TELEGRAM_UPDATED, payload);
  }

  emitAuthenticated(
    userId: string,
    email: string,
    method: UserAuthenticatedEvent['method'],
  ): void {
    const payload: UserAuthenticatedEvent = {
      userId,
      email,
      method,
      occurredAt: new Date().toISOString(),
    };
    this.rmqClient.emit(USER_EVENTS.AUTHENTICATED, payload);
  }
}
