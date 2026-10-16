import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy } from '@nestjs/microservices';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthSupportHelper } from './auth-support.helper';
import { OauthUpsertUseCase } from './oauth-upsert.use-case';
import { PrismaService } from './prisma.service';

describe('OauthUpsertUseCase', () => {
  const baseUser = {
    id: 'u1',
    email: 'a@example.com',
    name: 'Ann',
    avatarUrl: null as string | null,
    accountTier: 'BASE',
  };
  const telegramProfile = {
    telegramUserId: '100',
    username: 'ann',
    firstName: 'Ann',
    lastName: null,
    photoUrl: null,
  };
  const prisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    oAuthAccount: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
    },
  };
  const rmqClient = { emit: vi.fn() };
  const jwtService = {
    signAsync: vi.fn().mockResolvedValue('access-token'),
  };
  let useCase: OauthUpsertUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    jwtService.signAsync.mockResolvedValue('access-token');
    prisma.refreshToken.create.mockResolvedValue({});
    const authSupport = new AuthSupportHelper(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      {
        getOrThrow: vi.fn((key: string) => {
          if (key === 'JWT_ACCESS_TTL') {
            return '15m';
          }
          if (key === 'JWT_REFRESH_TTL') {
            return '7d';
          }
          throw new Error(`unexpected ${key}`);
        }),
      } as unknown as ConfigService,
      rmqClient as unknown as ClientProxy,
    );
    useCase = new OauthUpsertUseCase(
      prisma as unknown as PrismaService,
      authSupport,
    );
  });

  it('при обновлении существующего OAuth-аккаунта возвращает telegram', async () => {
    const updated = { ...baseUser, name: 'Ann Google' };
    prisma.oAuthAccount.findUnique.mockResolvedValue({
      userId: baseUser.id,
      user: baseUser,
    });
    prisma.user.update.mockResolvedValue(updated);
    prisma.user.findUnique.mockResolvedValue({
      ...updated,
      telegramProfile,
      oauthAccounts: [],
    });

    const result = await useCase.execute({
      provider: 'google',
      providerAccountId: 'g-1',
      email: 'a@example.com',
      name: 'Ann Google',
      avatarUrl: '',
    });

    expect(result.user).toMatchObject({
      id: 'u1',
      name: 'Ann Google',
      telegram: {
        userId: '100',
        username: 'ann',
        firstName: 'Ann',
      },
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      include: {
        telegramProfile: true,
        oauthAccounts: {
          where: { provider: 'telegram' },
          take: 1,
        },
      },
    });
  });

  it('при привязке OAuth к пользователю по email возвращает telegram', async () => {
    const updated = { ...baseUser, name: 'Ann GitHub' };
    prisma.oAuthAccount.findUnique.mockResolvedValue(null);
    prisma.user.findUnique
      .mockResolvedValueOnce(baseUser)
      .mockResolvedValueOnce({
        ...updated,
        telegramProfile,
        oauthAccounts: [],
      });
    prisma.user.update.mockResolvedValue(updated);
    prisma.oAuthAccount.create.mockResolvedValue({});

    const result = await useCase.execute({
      provider: 'github',
      providerAccountId: 'gh-1',
      email: 'a@example.com',
      name: 'Ann GitHub',
      avatarUrl: '',
    });

    expect(result.user.telegram).toMatchObject({
      userId: '100',
      username: 'ann',
    });
  });
});
