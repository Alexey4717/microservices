import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy, RpcException } from '@nestjs/microservices';

import { Metadata, status } from '@grpc/grpc-js';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';

import {
  USERS_RMQ_CLIENT,
  USER_EVENTS,
  USER_ID_METADATA_KEY,
  type UserAuthenticatedEvent,
  type UserCreatedEvent,
  type UserTelegramUpdatedEvent,
  type UserUpdatedEvent,
  emptyToNull,
  emptyToUndefined,
  getMetadataValue,
} from '@libs/common';
import type {
  AuthResponse,
  ConsumeTelegramLinkTokenRequest,
  CreateTelegramLinkTokenRequest,
  CreateTelegramLinkTokenResponse,
  Empty,
  GetMeByTelegramRequest,
  GetMeRequest,
  LoginRequest,
  LogoutRequest,
  OauthUpsertRequest,
  RefreshRequest,
  RegisterRequest,
  UpdateMeRequest,
  UpsertTelegramProfileRequest,
  UserResponse,
} from '@libs/proto';

import {
  type TelegramWebAppInitDataRequest,
  parseTelegramWebAppUserId,
} from '../helpers/telegram-webapp-init-data';
import { PrismaService } from './prisma.service';

const BCRYPT_ROUNDS = 10;
const TELEGRAM_OAUTH_PROVIDER = 'telegram';
const TELEGRAM_LINK_TOKEN_TTL_MS = 10 * 60 * 1000;

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

  async loginWithTelegram({
    initData,
  }: TelegramWebAppInitDataRequest): Promise<AuthResponse> {
    const botToken =
      this.configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    const telegramId = parseTelegramWebAppUserId(initData, botToken);
    const user = await this.getMeByTelegram({ telegramId });
    this.emitAuthenticated(user.id, user.email, 'oauth');
    const tokens = await this.issueTokens(user.id, user.email);
    return { ...tokens, user };
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

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: telegramUserInclude,
    });
    if (!user) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'User not found',
      });
    }

    return toUserResponse(user);
  }

  async updateMe(
    data: UpdateMeRequest,
    metadata: Metadata,
  ): Promise<UserResponse> {
    const userId = getMetadataValue(metadata, USER_ID_METADATA_KEY);
    if (!userId) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Missing user-id metadata',
      });
    }

    const hasName = hasOptionalField(data, 'name');
    const hasAvatarUrl = hasOptionalField(data, 'avatarUrl');
    if (!hasName && !hasAvatarUrl) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'At least one field is required',
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'User not found',
      });
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(hasName ? { name: emptyToUndefined(data.name) ?? null } : {}),
        ...(hasAvatarUrl ? { avatarUrl: emptyToNull(data.avatarUrl) } : {}),
      },
    });

    this.emitUpdated(updated);
    return toUserResponse(updated);
  }

  async getMeByTelegram(data: GetMeByTelegramRequest): Promise<UserResponse> {
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

  async createTelegramLinkToken(
    _data: CreateTelegramLinkTokenRequest,
    metadata: Metadata,
  ): Promise<CreateTelegramLinkTokenResponse> {
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

  async consumeTelegramLinkToken(
    data: ConsumeTelegramLinkTokenRequest,
  ): Promise<UserResponse> {
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

      this.emitTelegramUpdated(stored.userId);
      return this.userResponseById(stored.userId);
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

    this.emitTelegramUpdated(stored.userId);
    return this.userResponseById(stored.userId);
  }

  async upsertTelegramProfile(
    data: UpsertTelegramProfileRequest,
  ): Promise<UserResponse> {
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

    this.emitTelegramUpdated(account.userId);
    return this.userResponseById(account.userId);
  }

  private async userResponseById(userId: string): Promise<UserResponse> {
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

  private emitUpdated(user: {
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

  private emitTelegramUpdated(userId: string): void {
    const payload: UserTelegramUpdatedEvent = {
      userId,
      occurredAt: new Date().toISOString(),
    };
    this.rmqClient.emit(USER_EVENTS.TELEGRAM_UPDATED, payload);
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

function hasOptionalField(
  data: UpdateMeRequest,
  field: 'name' | 'avatarUrl',
): boolean {
  return hasOptionalStringField(data, field);
}

function hasOptionalStringField(data: object, field: string): boolean {
  const record = data as Record<string, unknown>;
  const oneof = record[`_${field}`];
  if (oneof === field) {
    return true;
  }
  return (
    oneof === undefined && Object.prototype.hasOwnProperty.call(data, field)
  );
}

function telegramProfileStub(userId: string, telegramUserId: string) {
  return {
    where: { userId },
    create: { userId, telegramUserId },
    update: { telegramUserId },
  };
}

const telegramUserInclude = {
  telegramProfile: true,
  oauthAccounts: {
    where: { provider: TELEGRAM_OAUTH_PROVIDER },
    take: 1,
  },
} as const;

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

type TelegramProfileRecord = {
  telegramUserId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
};

type TelegramOauthAccount = {
  provider: string;
  providerAccountId: string;
};

function toUserResponse(user: {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  accountTier?: string | null;
  telegramProfile?: TelegramProfileRecord | null;
  oauthAccounts?: TelegramOauthAccount[];
}): UserResponse {
  const telegram = toTelegramResponse(user);
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? '',
    avatarUrl: user.avatarUrl ?? '',
    accountTier: user.accountTier || 'BASE',
    ...(telegram ? { telegram } : {}),
  };
}

function toTelegramResponse(user: {
  telegramProfile?: TelegramProfileRecord | null;
  oauthAccounts?: TelegramOauthAccount[];
}): UserResponse['telegram'] | undefined {
  if (user.telegramProfile) {
    return {
      userId: user.telegramProfile.telegramUserId,
      username: user.telegramProfile.username ?? '',
      firstName: user.telegramProfile.firstName ?? '',
      lastName: user.telegramProfile.lastName ?? '',
      photoUrl: user.telegramProfile.photoUrl ?? '',
    };
  }

  const oauth = user.oauthAccounts?.find(
    (account) => account.provider === TELEGRAM_OAUTH_PROVIDER,
  );
  if (!oauth) {
    return undefined;
  }

  return {
    userId: oauth.providerAccountId,
    username: '',
    firstName: '',
    lastName: '',
    photoUrl: '',
  };
}

function sanitizePhotoUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  if (host === 'api.telegram.org' || host.endsWith('.telegram.org')) {
    return null;
  }
  if (parsed.pathname.includes('/file/bot')) {
    return null;
  }

  return trimmed;
}
