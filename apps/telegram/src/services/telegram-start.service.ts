import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { status } from '@grpc/grpc-js';

import { parseRpcError } from '@libs/common';

import { TelegramProfileService } from './telegram-profile.service';
import { UsersGrpcService } from './users-grpc.service';

export const TELEGRAM_START_LINK_PREFIX = 'link_';

export const TELEGRAM_START_REPLIES = {
  missingId: 'Не удалось определить ваш Telegram id.',
  unlinked:
    'Чтобы привязать Telegram, откройте профиль на сайте и нажмите «Привязать Telegram».',
  alreadyLinked: 'Этот Telegram уже привязан к аккаунту.',
  linkedOk: 'Telegram успешно привязан к аккаунту.',
  expired:
    'Ссылка недействительна или истекла. Создайте новую в профиле на сайте.',
  conflict: 'Этот Telegram уже привязан к другому аккаунту.',
} as const;

@Injectable()
export class TelegramStartService {
  private readonly logger = new Logger(TelegramStartService.name);

  constructor(
    private readonly usersGrpc: UsersGrpcService,
    private readonly telegramProfile: TelegramProfileService,
    private readonly configService: ConfigService,
  ) {}

  async handleStart(telegramId: string, payload: string): Promise<string> {
    if (!telegramId) {
      return TELEGRAM_START_REPLIES.missingId;
    }

    const trimmed = payload.trim();
    if (trimmed.startsWith(TELEGRAM_START_LINK_PREFIX)) {
      return this.consumeLink(
        telegramId,
        trimmed.slice(TELEGRAM_START_LINK_PREFIX.length),
      );
    }

    return this.describeLink(telegramId);
  }

  private async consumeLink(
    telegramId: string,
    token: string,
  ): Promise<string> {
    if (!token) {
      return TELEGRAM_START_REPLIES.expired;
    }

    try {
      const user = await this.usersGrpc.consumeTelegramLinkToken(
        { telegramId, token },
        this.internalToken(),
      );
      await this.refreshSnapshot(telegramId, user.id);
      return TELEGRAM_START_REPLIES.linkedOk;
    } catch (error) {
      const parsed = parseRpcError(error);
      if (parsed.code === status.ALREADY_EXISTS) {
        return TELEGRAM_START_REPLIES.conflict;
      }
      return TELEGRAM_START_REPLIES.expired;
    }
  }

  private async describeLink(telegramId: string): Promise<string> {
    try {
      const user = await this.usersGrpc.getMeByTelegram(
        telegramId,
        this.internalToken(),
      );
      await this.refreshSnapshot(telegramId, user.id);
      return TELEGRAM_START_REPLIES.alreadyLinked;
    } catch {
      return TELEGRAM_START_REPLIES.unlinked;
    }
  }

  private async refreshSnapshot(
    telegramId: string,
    userId: string,
  ): Promise<void> {
    if (!userId) {
      return;
    }

    try {
      await this.telegramProfile.sync(telegramId, userId);
    } catch (error) {
      this.logger.warn(
        `Не удалось обновить снимок профиля Telegram: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private internalToken(): string {
    return this.configService.getOrThrow<string>('INTERNAL_SERVICE_TOKEN');
  }
}
