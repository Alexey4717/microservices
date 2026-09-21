import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy, RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';
import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { USER_EVENTS } from '@libs/common';

import { AuthService } from './auth.service';
import { PrismaService } from './prisma.service';

const BOT_TOKEN = 'test-bot-token';
const NOW_SEC = Math.floor(Date.now() / 1000);

function signInitData(fields: Record<string, string>): string {
  const entries = Object.entries(fields).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  const dataCheckString = entries
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN)
    .digest();
  const hash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  const params = new URLSearchParams(fields);
  params.set('hash', hash);
  return params.toString();
}

function rpcError(error: unknown): { code: status; message: string } {
  return (error as RpcException).getError() as {
    code: status;
    message: string;
  };
}

describe('AuthService.loginWithTelegram', () => {
  const user = {
    id: 'u1',
    email: 'a@example.com',
    name: 'Ann',
    avatarUrl: null,
    accountTier: 'BASE',
  };
  const prisma = {
    oAuthAccount: {
      findUnique: vi.fn(),
    },
    refreshToken: {
      create: vi.fn(),
    },
  };
  const rmqClient = { emit: vi.fn() };
  const jwtService = {
    signAsync: vi.fn().mockResolvedValue('access-token'),
  };
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    jwtService.signAsync.mockResolvedValue('access-token');
    prisma.refreshToken.create.mockResolvedValue({});
    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      {
        getOrThrow: vi.fn((key: string) => {
          if (key === 'TELEGRAM_BOT_TOKEN') {
            return BOT_TOKEN;
          }
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
  });

  it('выдаёт JWT для привязанного Telegram', async () => {
    const initData = signInitData({
      auth_date: String(NOW_SEC),
      user: JSON.stringify({ id: 100, first_name: 'Ann' }),
    });
    prisma.oAuthAccount.findUnique.mockResolvedValue({
      user: { ...user, telegramProfile: null, oauthAccounts: [] },
    });

    await expect(
      service.loginWithTelegram({ initData }),
    ).resolves.toMatchObject({
      accessToken: 'access-token',
      user: { id: 'u1', email: 'a@example.com' },
    });
    expect(rmqClient.emit).toHaveBeenCalledWith(
      USER_EVENTS.AUTHENTICATED,
      expect.objectContaining({
        userId: 'u1',
        method: 'oauth',
      }),
    );
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });

  it('не создаёт пользователя, если Telegram не привязан', async () => {
    const initData = signInitData({
      auth_date: String(NOW_SEC),
      user: JSON.stringify({ id: 100 }),
    });
    prisma.oAuthAccount.findUnique.mockResolvedValue(null);

    try {
      await service.loginWithTelegram({ initData });
      expect.fail('должен бросить RpcException');
    } catch (error) {
      expect(error).toBeInstanceOf(RpcException);
      expect(rpcError(error)).toMatchObject({
        code: status.NOT_FOUND,
        message: 'Telegram is not linked',
      });
    }
    expect(prisma.refreshToken.create).not.toHaveBeenCalled();
  });

  it('битая подпись — UNAUTHENTICATED', async () => {
    await expect(
      service.loginWithTelegram({ initData: 'user=%7B%22id%22%3A100%7D' }),
    ).rejects.toBeInstanceOf(RpcException);
    expect(prisma.oAuthAccount.findUnique).not.toHaveBeenCalled();
  });
});
