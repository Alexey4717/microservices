import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy, RpcException } from '@nestjs/microservices';

import { Metadata, status } from '@grpc/grpc-js';
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { USER_EVENTS } from '@libs/common';

import { AuthService } from './auth.service';
import { PrismaService } from './prisma.service';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function rpcError(error: unknown): { code: status; message: string } {
  return (error as RpcException).getError() as {
    code: status;
    message: string;
  };
}

describe('AuthService Telegram link', () => {
  const user = {
    id: 'u1',
    email: 'a@example.com',
    name: 'Ann',
    avatarUrl: null,
    accountTier: 'BASE',
  };
  const prisma = {
    user: {
      findUnique: vi.fn(),
    },
    oAuthAccount: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    telegramLinkToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    telegramProfile: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  const rmqClient = { emit: vi.fn() };
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(async (ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    service = new AuthService(
      prisma as unknown as PrismaService,
      {} as JwtService,
      { getOrThrow: vi.fn() } as unknown as ConfigService,
      rmqClient as unknown as ClientProxy,
    );
  });

  describe('createTelegramLinkToken', () => {
    it('без user-id metadata — UNAUTHENTICATED', async () => {
      await expect(
        service.createTelegramLinkToken({}, new Metadata()),
      ).rejects.toBeInstanceOf(RpcException);

      try {
        await service.createTelegramLinkToken({}, new Metadata());
      } catch (error) {
        expect(rpcError(error)).toMatchObject({
          code: status.UNAUTHENTICATED,
          message: 'Missing user-id metadata',
        });
      }
    });

    it('выдаёт одноразовый токен и сохраняет хеш', async () => {
      const metadata = new Metadata();
      metadata.set('user-id', 'u1');
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.telegramLinkToken.deleteMany.mockResolvedValue({ count: 0 });
      prisma.telegramLinkToken.create.mockResolvedValue({});

      const result = await service.createTelegramLinkToken({}, metadata);

      expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      const created = prisma.telegramLinkToken.create.mock.calls[0]?.[0] as {
        data: { userId: string; tokenHash: string; expiresAt: Date };
      };
      expect(created.data).toMatchObject({
        userId: 'u1',
        tokenHash: hashToken(result.token),
      });
      expect(created.data.expiresAt).toBeInstanceOf(Date);
      const ttlMs = created.data.expiresAt.getTime() - Date.now();
      expect(ttlMs).toBeGreaterThan(9 * 60 * 1000);
      expect(ttlMs).toBeLessThanOrEqual(10 * 60 * 1000);
    });

    it('удаляет прежние токены этого пользователя, чужие не трогает', async () => {
      const metadata = new Metadata();
      metadata.set('user-id', 'u1');
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.telegramLinkToken.deleteMany.mockResolvedValue({ count: 1 });
      prisma.telegramLinkToken.create.mockResolvedValue({});

      await service.createTelegramLinkToken({}, metadata);

      expect(prisma.telegramLinkToken.deleteMany).toHaveBeenCalledTimes(1);
      expect(prisma.telegramLinkToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
      });
      expect(prisma.telegramLinkToken.create).toHaveBeenCalledTimes(1);
      expect(
        prisma.telegramLinkToken.deleteMany.mock.invocationCallOrder[0],
      ).toBeLessThan(
        prisma.telegramLinkToken.create.mock.invocationCallOrder[0],
      );
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('consumeTelegramLinkToken', () => {
    const token = 'a'.repeat(43);

    function storedToken(overrides: Record<string, unknown> = {}) {
      return {
        id: 't1',
        userId: 'u1',
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        usedAt: null,
        user,
        ...overrides,
      };
    }

    function linkedUser() {
      return {
        ...user,
        telegramProfile: {
          telegramUserId: '100',
          username: null,
          firstName: null,
          lastName: null,
          photoUrl: null,
        },
        oauthAccounts: [{ provider: 'telegram', providerAccountId: '100' }],
      };
    }

    it('привязывает telegram к пользователю', async () => {
      prisma.telegramLinkToken.findUnique.mockResolvedValue(storedToken());
      prisma.oAuthAccount.findUnique.mockResolvedValue(null);
      prisma.oAuthAccount.create.mockResolvedValue({});
      prisma.telegramProfile.upsert.mockResolvedValue({});
      prisma.telegramLinkToken.delete.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue(linkedUser());

      await expect(
        service.consumeTelegramLinkToken({
          telegramId: '100',
          token,
        }),
      ).resolves.toMatchObject({
        id: 'u1',
        email: 'a@example.com',
        telegram: { userId: '100' },
      });

      expect(prisma.oAuthAccount.create).toHaveBeenCalledWith({
        data: {
          userId: 'u1',
          provider: 'telegram',
          providerAccountId: '100',
        },
      });
      expect(prisma.telegramProfile.upsert).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        create: { userId: 'u1', telegramUserId: '100' },
        update: { telegramUserId: '100' },
      });
      expect(prisma.telegramLinkToken.delete).toHaveBeenCalledWith({
        where: { id: 't1' },
      });
      expect(prisma.telegramLinkToken.update).not.toHaveBeenCalled();
      expect(rmqClient.emit).toHaveBeenCalledWith(
        USER_EVENTS.TELEGRAM_UPDATED,
        expect.objectContaining({ userId: 'u1' }),
      );
    });

    it('повтор для того же пользователя — идемпотентный успех', async () => {
      prisma.telegramLinkToken.findUnique.mockResolvedValue(
        storedToken({ usedAt: new Date() }),
      );
      prisma.oAuthAccount.findUnique.mockResolvedValue({
        userId: 'u1',
        provider: 'telegram',
        providerAccountId: '100',
      });
      prisma.telegramProfile.upsert.mockResolvedValue({});
      prisma.telegramLinkToken.delete.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue(linkedUser());

      await expect(
        service.consumeTelegramLinkToken({
          telegramId: '100',
          token,
        }),
      ).resolves.toMatchObject({ id: 'u1', telegram: { userId: '100' } });
      expect(prisma.oAuthAccount.create).not.toHaveBeenCalled();
      expect(prisma.telegramProfile.upsert).toHaveBeenCalled();
      expect(prisma.telegramLinkToken.delete).toHaveBeenCalledWith({
        where: { id: 't1' },
      });
      expect(rmqClient.emit).toHaveBeenCalledWith(
        USER_EVENTS.TELEGRAM_UPDATED,
        expect.objectContaining({ userId: 'u1' }),
      );
    });

    it('telegram уже у другого пользователя — ALREADY_EXISTS', async () => {
      prisma.telegramLinkToken.findUnique.mockResolvedValue(storedToken());
      prisma.oAuthAccount.findUnique.mockResolvedValue({
        userId: 'u2',
        provider: 'telegram',
        providerAccountId: '100',
      });

      try {
        await service.consumeTelegramLinkToken({
          telegramId: '100',
          token,
        });
        expect.fail('должен бросить RpcException');
      } catch (error) {
        expect(error).toBeInstanceOf(RpcException);
        expect(rpcError(error)).toMatchObject({
          code: status.ALREADY_EXISTS,
          message: 'Telegram is already linked to another user',
        });
      }
      expect(rmqClient.emit).not.toHaveBeenCalled();
    });

    it('истёкший токен — NOT_FOUND', async () => {
      prisma.telegramLinkToken.findUnique.mockResolvedValue(
        storedToken({ expiresAt: new Date(Date.now() - 1000) }),
      );

      try {
        await service.consumeTelegramLinkToken({
          telegramId: '100',
          token,
        });
        expect.fail('должен бросить RpcException');
      } catch (error) {
        expect(error).toBeInstanceOf(RpcException);
        expect(rpcError(error)).toMatchObject({
          code: status.NOT_FOUND,
          message: 'Invalid or expired link token',
        });
      }
      expect(prisma.oAuthAccount.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getMeByTelegram', () => {
    it('NOT_FOUND если telegram не привязан', async () => {
      prisma.oAuthAccount.findUnique.mockResolvedValue(null);

      try {
        await service.getMeByTelegram({ telegramId: '100' });
        expect.fail('должен бросить RpcException');
      } catch (error) {
        expect(error).toBeInstanceOf(RpcException);
        expect(rpcError(error)).toMatchObject({
          code: status.NOT_FOUND,
        });
      }
    });
  });

  describe('getMe telegram', () => {
    it('включает telegram, если профиль привязан', async () => {
      const metadata = new Metadata();
      metadata.set('user-id', 'u1');
      prisma.user.findUnique.mockResolvedValue({
        ...user,
        telegramProfile: {
          telegramUserId: '100',
          username: 'ann_tg',
          firstName: 'Ann',
          lastName: 'Smith',
          photoUrl: 'https://cdn.example/tg.jpg',
        },
        oauthAccounts: [],
      });

      await expect(service.getMe({}, metadata)).resolves.toMatchObject({
        id: 'u1',
        telegram: {
          userId: '100',
          username: 'ann_tg',
          firstName: 'Ann',
          lastName: 'Smith',
          photoUrl: 'https://cdn.example/tg.jpg',
        },
      });
    });

    it('не включает telegram, если не привязан', async () => {
      const metadata = new Metadata();
      metadata.set('user-id', 'u1');
      prisma.user.findUnique.mockResolvedValue({
        ...user,
        telegramProfile: null,
        oauthAccounts: [],
      });

      const result = await service.getMe({}, metadata);
      expect(result.telegram).toBeUndefined();
    });
  });

  describe('upsertTelegramProfile', () => {
    it('пишет публичный photoUrl и отклоняет URL Bot API', async () => {
      prisma.oAuthAccount.findUnique.mockResolvedValue({
        userId: 'u1',
        provider: 'telegram',
        providerAccountId: '100',
      });
      prisma.telegramProfile.upsert.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({
        ...user,
        telegramProfile: {
          telegramUserId: '100',
          username: 'ann_tg',
          firstName: 'Ann',
          lastName: 'Smith',
          photoUrl: 'https://cdn.example/tg.jpg',
        },
        oauthAccounts: [],
      });

      await service.upsertTelegramProfile({
        telegramId: '100',
        username: 'ann_tg',
        firstName: 'Ann',
        lastName: 'Smith',
        photoUrl: 'https://api.telegram.org/file/botSECRET/photos/file.jpg',
      });

      const upserted = prisma.telegramProfile.upsert.mock.calls[0]?.[0] as {
        update: { photoUrl: string | null };
      };
      expect(upserted.update.photoUrl).toBeNull();

      prisma.telegramProfile.upsert.mockClear();
      prisma.user.findUnique.mockResolvedValue({
        ...user,
        telegramProfile: {
          telegramUserId: '100',
          username: 'ann_tg',
          firstName: 'Ann',
          lastName: 'Smith',
          photoUrl: 'https://cdn.example/tg.jpg',
        },
        oauthAccounts: [],
      });

      await service.upsertTelegramProfile({
        telegramId: '100',
        username: 'ann_tg',
        firstName: 'Ann',
        lastName: 'Smith',
        photoUrl: 'https://cdn.example/tg.jpg',
      });

      const publicUpsert = prisma.telegramProfile.upsert.mock.calls[0]?.[0] as {
        update: { photoUrl: string | null };
      };
      expect(publicUpsert.update.photoUrl).toBe('https://cdn.example/tg.jpg');
      expect(rmqClient.emit).toHaveBeenCalledWith(
        USER_EVENTS.TELEGRAM_UPDATED,
        expect.objectContaining({ userId: 'u1' }),
      );
    });
  });
});
