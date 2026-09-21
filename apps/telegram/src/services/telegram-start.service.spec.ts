import { ConfigService } from '@nestjs/config';

import { status } from '@grpc/grpc-js';
import { InlineKeyboard, Keyboard } from 'grammy';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TELEGRAM_KEYBOARD_TEXTS } from '../helpers/telegram-mini-app';
import { TelegramProfileService } from './telegram-profile.service';
import {
  TELEGRAM_START_REPLIES,
  TelegramStartService,
} from './telegram-start.service';
import { UsersGrpcService } from './users-grpc.service';

const INTERNAL_TOKEN = 'internal-token';
const MINI_APP_URL = 'https://mini.ngrok-free.app';

function configService(miniAppUrl?: string): ConfigService {
  return {
    getOrThrow: vi.fn().mockReturnValue(INTERNAL_TOKEN),
    get: vi.fn((key: string) =>
      key === 'TELEGRAM_MINI_APP_URL' ? miniAppUrl : undefined,
    ),
  } as unknown as ConfigService;
}

function keyboardButtons(markup: Keyboard | InlineKeyboard | undefined) {
  if (markup instanceof Keyboard) {
    return markup.keyboard.flat();
  }
  if (markup instanceof InlineKeyboard) {
    return markup.inline_keyboard.flat();
  }
  return [];
}

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
      configService(),
    );
  });

  it('/start без payload — не привязан, только текст если Mini App URL пуст', async () => {
    usersGrpc.getMeByTelegram.mockRejectedValue({ code: status.NOT_FOUND });

    await expect(service.handleStart('100', '')).resolves.toEqual([
      { text: TELEGRAM_START_REPLIES.unlinked },
    ]);
    expect(usersGrpc.getMeByTelegram).toHaveBeenCalledWith(
      '100',
      INTERNAL_TOKEN,
    );
    expect(telegramProfile.sync).not.toHaveBeenCalled();
  });

  it('/start без payload — уже привязан, только текст если Mini App URL пуст', async () => {
    usersGrpc.getMeByTelegram.mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
    });

    await expect(service.handleStart('100', '')).resolves.toEqual([
      { text: TELEGRAM_START_REPLIES.alreadyLinked },
    ]);
    expect(telegramProfile.sync).toHaveBeenCalledWith('100', 'u1');
  });

  it('/start link_<token> — успешная привязка', async () => {
    usersGrpc.consumeTelegramLinkToken.mockResolvedValue({ id: 'u1' });

    await expect(service.handleStart('100', 'link_abc')).resolves.toEqual([
      { text: TELEGRAM_START_REPLIES.linkedOk },
    ]);
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

    await expect(service.handleStart('100', 'link_abc')).resolves.toEqual([
      { text: TELEGRAM_START_REPLIES.conflict },
    ]);
    expect(telegramProfile.sync).not.toHaveBeenCalled();
  });

  it('/start отвечает даже если снимок профиля не обновился', async () => {
    usersGrpc.consumeTelegramLinkToken.mockResolvedValue({ id: 'u1' });
    telegramProfile.sync.mockRejectedValue(new Error('getChat failed'));

    await expect(service.handleStart('100', 'link_abc')).resolves.toEqual([
      { text: TELEGRAM_START_REPLIES.linkedOk },
    ]);
  });

  describe('с TELEGRAM_MINI_APP_URL', () => {
    beforeEach(() => {
      service = new TelegramStartService(
        usersGrpc as unknown as UsersGrpcService,
        telegramProfile as unknown as TelegramProfileService,
        configService(MINI_APP_URL),
      );
    });

    it('привязан — reply webApp Кабинет + Мои видео и inline Открыть кабинет', async () => {
      usersGrpc.getMeByTelegram.mockResolvedValue({ id: 'u1' });

      const messages = await service.handleStart('100', '');
      expect(messages).toHaveLength(2);
      expect(messages[0]?.text).toBe(TELEGRAM_START_REPLIES.alreadyLinked);
      expect(messages[0]?.replyMarkup).toBeInstanceOf(Keyboard);
      const replyButtons = keyboardButtons(messages[0]?.replyMarkup);
      expect(replyButtons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: TELEGRAM_KEYBOARD_TEXTS.cabinet,
            web_app: { url: MINI_APP_URL },
          }),
          expect.objectContaining({
            text: TELEGRAM_KEYBOARD_TEXTS.myVideos,
          }),
        ]),
      );
      expect(messages[1]?.text).toBe(TELEGRAM_START_REPLIES.openCabinetHint);
      expect(messages[1]?.replyMarkup).toBeInstanceOf(InlineKeyboard);
      expect(keyboardButtons(messages[1]?.replyMarkup)).toEqual([
        expect.objectContaining({
          text: TELEGRAM_KEYBOARD_TEXTS.openCabinet,
          web_app: { url: MINI_APP_URL },
        }),
      ]);
    });

    it('не привязан — кнопка Как привязать аккаунт', async () => {
      usersGrpc.getMeByTelegram.mockRejectedValue({ code: status.NOT_FOUND });

      const messages = await service.handleStart('100', '');
      expect(messages).toHaveLength(1);
      expect(messages[0]?.text).toBe(TELEGRAM_START_REPLIES.unlinked);
      expect(messages[0]?.replyMarkup).toBeInstanceOf(Keyboard);
      expect(keyboardButtons(messages[0]?.replyMarkup)).toEqual([
        expect.objectContaining({
          text: TELEGRAM_KEYBOARD_TEXTS.howToLink,
        }),
      ]);
    });

    it('Мои видео — inline на /videos если привязан', async () => {
      usersGrpc.getMeByTelegram.mockResolvedValue({ id: 'u1' });

      const messages = await service.handleMyVideos('100');
      expect(messages[0]?.text).toBe(TELEGRAM_START_REPLIES.openVideos);
      expect(keyboardButtons(messages[0]?.replyMarkup)).toEqual([
        expect.objectContaining({
          text: TELEGRAM_KEYBOARD_TEXTS.openVideos,
          web_app: { url: `${MINI_APP_URL}/videos` },
        }),
      ]);
    });

    it('Мои видео — инструкция привязки если не привязан', async () => {
      usersGrpc.getMeByTelegram.mockRejectedValue({ code: status.NOT_FOUND });

      const messages = await service.handleMyVideos('100');
      expect(messages[0]?.text).toBe(TELEGRAM_START_REPLIES.unlinked);
    });

    it('Как привязать аккаунт — тот же unlinked-текст', () => {
      const messages = service.handleHowToLink();
      expect(messages[0]?.text).toBe(TELEGRAM_START_REPLIES.unlinked);
    });
  });
});
