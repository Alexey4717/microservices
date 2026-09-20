import { ConfigService } from '@nestjs/config';

import { status } from '@grpc/grpc-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TelegramProfileService } from './telegram-profile.service';
import {
  TELEGRAM_START_REPLIES,
  TelegramStartService,
} from './telegram-start.service';
import { UsersGrpcService } from './users-grpc.service';

const INTERNAL_TOKEN = 'internal-token';

describe('TelegramStartService', () => {
  const usersGrpc = {
    getMeByTelegram: vi.fn(),
    consumeTelegramLinkToken: vi.fn(),
  };
  const telegramProfile = {
    sync: vi.fn(),
  };
  let service: TelegramStartService;

  beforeEach(() => {
    vi.clearAllMocks();
    telegramProfile.sync.mockResolvedValue(undefined);
    service = new TelegramStartService(
      usersGrpc as unknown as UsersGrpcService,
      telegramProfile as unknown as TelegramProfileService,
      {
        getOrThrow: vi.fn().mockReturnValue(INTERNAL_TOKEN),
      } as unknown as ConfigService,
    );
  });

  it('/start без payload — не привязан', async () => {
    usersGrpc.getMeByTelegram.mockRejectedValue({ code: status.NOT_FOUND });

    await expect(service.handleStart('100', '')).resolves.toBe(
      TELEGRAM_START_REPLIES.unlinked,
    );
    expect(usersGrpc.getMeByTelegram).toHaveBeenCalledWith(
      '100',
      INTERNAL_TOKEN,
    );
    expect(telegramProfile.sync).not.toHaveBeenCalled();
  });

  it('/start без payload — уже привязан', async () => {
    usersGrpc.getMeByTelegram.mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
    });

    await expect(service.handleStart('100', '')).resolves.toBe(
      TELEGRAM_START_REPLIES.alreadyLinked,
    );
    expect(telegramProfile.sync).toHaveBeenCalledWith('100', 'u1');
  });

  it('/start link_<token> — успешная привязка', async () => {
    usersGrpc.consumeTelegramLinkToken.mockResolvedValue({ id: 'u1' });

    await expect(service.handleStart('100', 'link_abc')).resolves.toBe(
      TELEGRAM_START_REPLIES.linkedOk,
    );
    expect(usersGrpc.consumeTelegramLinkToken).toHaveBeenCalledWith(
      { telegramId: '100', token: 'abc' },
      INTERNAL_TOKEN,
    );
    expect(telegramProfile.sync).toHaveBeenCalledWith('100', 'u1');
  });

  it('/start link_<token> — конфликт с другим аккаунтом', async () => {
    usersGrpc.consumeTelegramLinkToken.mockRejectedValue({
      code: status.ALREADY_EXISTS,
    });

    await expect(service.handleStart('100', 'link_abc')).resolves.toBe(
      TELEGRAM_START_REPLIES.conflict,
    );
    expect(telegramProfile.sync).not.toHaveBeenCalled();
  });

  it('/start отвечает даже если снимок профиля не обновился', async () => {
    usersGrpc.consumeTelegramLinkToken.mockResolvedValue({ id: 'u1' });
    telegramProfile.sync.mockRejectedValue(new Error('getChat failed'));

    await expect(service.handleStart('100', 'link_abc')).resolves.toBe(
      TELEGRAM_START_REPLIES.linkedOk,
    );
  });
});
