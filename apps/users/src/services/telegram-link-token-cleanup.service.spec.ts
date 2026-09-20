import { ConfigService } from '@nestjs/config';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from './prisma.service';
import { TelegramLinkTokenCleanupService } from './telegram-link-token-cleanup.service';

describe('TelegramLinkTokenCleanupService', () => {
  const prisma = {
    telegramLinkToken: {
      deleteMany: vi.fn(),
    },
  };

  function makeService(
    env: Record<string, string | number | undefined>,
  ): TelegramLinkTokenCleanupService {
    return new TelegramLinkTokenCleanupService(
      prisma as unknown as PrismaService,
      { get: vi.fn((key: string) => env[key]) } as unknown as ConfigService,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.telegramLinkToken.deleteMany.mockResolvedValue({ count: 2 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('удаляет истёкшие и used, валидные неиспользованные не входят в условие', async () => {
    const service = makeService({ NODE_ENV: 'test' });

    await expect(service.cleanup()).resolves.toBe(2);

    const deleteArg = prisma.telegramLinkToken.deleteMany.mock.calls[0]?.[0] as
      | {
          where: {
            OR: [{ expiresAt: { lt: Date } }, { usedAt: { not: null } }];
          };
        }
      | undefined;
    expect(deleteArg?.where.OR[0]?.expiresAt.lt).toBeInstanceOf(Date);
    expect(deleteArg?.where.OR[1]).toEqual({ usedAt: { not: null } });
    expect(deleteArg?.where).not.toHaveProperty('userId');
  });

  it('не запускает интервал при NODE_ENV=test', () => {
    const spy = vi.spyOn(global, 'setInterval');
    const service = makeService({ NODE_ENV: 'test' });

    service.onModuleInit();

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('не запускает интервал при интервале 0', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const spy = vi.spyOn(global, 'setInterval');
    const service = makeService({
      NODE_ENV: 'development',
      TELEGRAM_LINK_TOKEN_CLEANUP_INTERVAL_MS: 0,
    });

    service.onModuleInit();

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('чистит таймер на destroy', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.useFakeTimers();
    const service = makeService({
      NODE_ENV: 'development',
      TELEGRAM_LINK_TOKEN_CLEANUP_INTERVAL_MS: 60_000,
    });

    service.onModuleInit();
    service.onModuleDestroy();
    vi.advanceTimersByTime(120_000);

    expect(prisma.telegramLinkToken.deleteMany).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
