import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type TelegramBotMessage } from '../helpers/telegram-bot-message';
import {
  linkedReplyKeyboard,
  openCabinetInlineKeyboard,
  unlinkedReplyKeyboard,
} from '../helpers/telegram-keyboards';
import {
  TELEGRAM_START_REPLIES,
  normalizeMiniAppUrl,
} from '../helpers/telegram-mini-app';
import { TelegramProfileService } from './telegram-profile.service';
import { UsersGrpcService } from './users-grpc.service';

@Injectable()
export class TelegramStartHelper {
  private readonly logger = new Logger(TelegramStartHelper.name);

  constructor(
    private readonly usersGrpc: UsersGrpcService,
    private readonly telegramProfile: TelegramProfileService,
    private readonly configService: ConfigService,
  ) {}

  internalToken(): string {
    return this.configService.getOrThrow<string>('INTERNAL_SERVICE_TOKEN');
  }

  miniAppUrl(): string {
    return normalizeMiniAppUrl(
      this.configService.get<string>('TELEGRAM_MINI_APP_URL'),
    );
  }

  linkedMessages(text: string): TelegramBotMessage[] {
    const miniAppUrl = this.miniAppUrl();
    if (!miniAppUrl) {
      return [{ text }];
    }

    return [
      {
        text,
        replyMarkup: linkedReplyKeyboard(miniAppUrl),
      },
      {
        text: TELEGRAM_START_REPLIES.openCabinetHint,
        replyMarkup: openCabinetInlineKeyboard(miniAppUrl),
      },
    ];
  }

  unlinkedMessages(): TelegramBotMessage[] {
    const text = TELEGRAM_START_REPLIES.unlinked;
    if (!this.miniAppUrl()) {
      return [{ text }];
    }

    return [
      {
        text,
        replyMarkup: unlinkedReplyKeyboard(),
      },
    ];
  }

  async refreshSnapshot(telegramId: string, userId: string): Promise<void> {
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

  async isLinked(telegramId: string): Promise<boolean> {
    try {
      const user = await this.usersGrpc.getMeByTelegram(
        telegramId,
        this.internalToken(),
      );
      await this.refreshSnapshot(telegramId, user.id);
      return true;
    } catch {
      return false;
    }
  }
}
