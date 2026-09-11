import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy, RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';
import { Metadata } from '@grpc/grpc-js';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';

import {
  USERS_RMQ_CLIENT,
  USER_EVENTS,
  USER_ID_METADATA_KEY,
  type UserAuthenticatedEvent,
  type UserCreatedEvent,
  type UserUpdatedEvent,
  getMetadataValue,
} from '@libs/common';
import type {
  AuthResponse,
  Empty,
  GetMeRequest,
  LoginRequest,
  LogoutRequest,
  OauthUpsertRequest,
  RefreshRequest,
  RegisterRequest,
  UserResponse,
} from '@libs/proto';

import { PrismaService } from './prisma.service';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(USERS_RMQ_CLIENT) private readonly rmqClient: ClientProxy,
  ) {}

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const email = normalizeEmail(data.email);
    this.assertEmail(email);
    this.assertPassword(data.password);

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new RpcException({
        code: status.ALREADY_EXISTS,
        message: 'Email already registered',
      });
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name: emptyToUndefined(data.name),
      },
    });

    this.emitCreated(user);
    const tokens = await this.issueTokens(user.id, user.email);
    return { ...tokens, user: toUserResponse(user) };
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const email = normalizeEmail(data.email);
    this.assertEmail(email);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Invalid credentials',
      });
    }

    const matches = await bcrypt.compare(data.password, user.passwordHash);
    if (!matches) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Invalid credentials',
      });
    }

    this.emitAuthenticated(user.id, user.email, 'password');
    const tokens = await this.issueTokens(user.id, user.email);
    return { ...tokens, user: toUserResponse(user) };
  }

  async oauthUpsert(data: OauthUpsertRequest): Promise<AuthResponse> {
    const provider = data.provider?.trim().toLowerCase();
    const providerAccountId = data.providerAccountId?.trim();
    const email = normalizeEmail(data.email);

    if (!provider || !['google', 'github'].includes(provider)) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Unsupported OAuth provider',
      });
    }
    if (!providerAccountId) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'providerAccountId is required',
      });
    }
    this.assertEmail(email);

    const existingAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: { provider, providerAccountId },
      },
      include: { user: true },
    });

    if (existingAccount) {
      const user = await this.prisma.user.update({
        where: { id: existingAccount.userId },
        data: {
          name: emptyToUndefined(data.name) ?? existingAccount.user.name,
          avatarUrl:
            emptyToUndefined(data.avatarUrl) ?? existingAccount.user.avatarUrl,
        },
      });
      this.emitUpdated(user);
      this.emitAuthenticated(user.id, user.email, 'oauth');
      const tokens = await this.issueTokens(user.id, user.email);
      return { ...tokens, user: toUserResponse(user) };
    }

    let user = await this.prisma.user.findUnique({ where: { email } });
    let created = false;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: emptyToUndefined(data.name),
          avatarUrl: emptyToUndefined(data.avatarUrl),
        },
      });
      created = true;
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          name: emptyToUndefined(data.name) ?? user.name,
          avatarUrl: emptyToUndefined(data.avatarUrl) ?? user.avatarUrl,
        },
      });
    }

    await this.prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider,
        providerAccountId,
      },
    });

    if (created) {
      this.emitCreated(user);
    } else {
      this.emitUpdated(user);
    }
    this.emitAuthenticated(user.id, user.email, 'oauth');
    const tokens = await this.issueTokens(user.id, user.email);
    return { ...tokens, user: toUserResponse(user) };
  }

  async refresh(data: RefreshRequest): Promise<AuthResponse> {
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

    const tokens = await this.issueTokens(stored.user.id, stored.user.email);
    return { ...tokens, user: toUserResponse(stored.user) };
  }

  async logout(data: LogoutRequest): Promise<Empty> {
    const refreshToken = data.refreshToken?.trim();
    if (!refreshToken) {
      return {};
    }

    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return {};
  }

  async getMe(_data: GetMeRequest, metadata: Metadata): Promise<UserResponse> {
    const userId = getMetadataValue(metadata, USER_ID_METADATA_KEY);
    if (!userId) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Missing user-id metadata',
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'User not found',
      });
    }

    return toUserResponse(user);
  }

  private async issueTokens(
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

  private emitCreated(user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  }): void {
    const payload: UserCreatedEvent = {
      userId: user.id,
      email: user.email,
      name: user.name ?? '',
      avatarUrl: user.avatarUrl ?? '',
      occurredAt: new Date().toISOString(),
    };
    this.rmqClient.emit(USER_EVENTS.CREATED, payload);
  }

  private emitUpdated(user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  }): void {
    const payload: UserUpdatedEvent = {
      userId: user.id,
      email: user.email,
      name: user.name ?? '',
      avatarUrl: user.avatarUrl ?? '',
      occurredAt: new Date().toISOString(),
    };
    this.rmqClient.emit(USER_EVENTS.UPDATED, payload);
  }

  private emitAuthenticated(
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

  private assertEmail(email: string): void {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Invalid email',
      });
    }
  }

  private assertPassword(password: string): void {
    if (!password || password.length < 8) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Password must be at least 8 characters',
      });
    }
  }
}

function normalizeEmail(email: string | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function parseTtlToMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!match) {
    const asNumber = Number(ttl);
    if (!Number.isNaN(asNumber) && asNumber > 0) {
      return asNumber * 1000;
    }
    return 7 * 24 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * (multipliers[unit] ?? 1000);
}

function toUserResponse(user: {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? '',
    avatarUrl: user.avatarUrl ?? '',
  };
}
