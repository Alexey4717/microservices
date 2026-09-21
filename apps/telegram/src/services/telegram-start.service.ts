import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { status } from '@grpc/grpc-js';
import type { InlineKeyboard, Keyboard } from 'grammy';

import { parseRpcError } from '@libs/common';

import {
  linkedReplyKeyboard,
  openCabinetInlineKeyboard,
  openVideosInlineKeyboard,
  unlinkedReplyKeyboard,
} from '../helpers/telegram-keyboards';
import {
  TELEGRAM_START_LINK_PREFIX,
  TELEGRAM_START_REPLIES,
  normalizeMiniAppUrl,
} from '../helpers/telegram-mini-app';
import { TelegramProfileService } from './telegram-profile.service';
import { UsersGrpcService } from './users-grpc.service';

export {
  TELEGRAM_KEYBOARD_TEXTS,
  TELEGRAM_START_LINK_PREFIX,
  TELEGRAM_START_REPLIES,
} from '../helpers/telegram-mini-app';

export type TelegramBotMessage = {
  text: string;
  replyMarkup?: Keyboard | InlineKeyboard;
};

@Injectable()
export class TelegramStartService {
  private readonly logger = new Logger(TelegramStartService.name);

  constructor(
    private readonly usersGrpc: UsersGrpcService,
    private readonly telegramProfile: TelegramProfileService,
    private readonly configService: ConfigService,
  ) {}

  async handleStart(
    telegramId: string,
    payload: string,
  ): Promise<TelegramBotMessage[]> {
    if (!telegramId) {
      return [{ text: TELEGRAM_START_REPLIES.missingId }];
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

  async handleMyVideos(telegramId: string): Promise<TelegramBotMessage[]> {
    if (!telegramId) {
      return [{ text: TELEGRAM_START_REPLIES.missingId }];
    }

    const linked = await this.isLinked(telegramId);
    const miniAppUrl = this.miniAppUrl();
    if (!linked) {
      return this.unlinkedMessages();
    }
    if (!miniAppUrl) {
      return [{ text: TELEGRAM_START_REPLIES.alreadyLinked }];
    }

    return [
      {
        text: TELEGRAM_START_REPLIES.openVideos,
        replyMarkup: openVideosInlineKeyboard(miniAppUrl),
      },
    ];
  }

  handleHowToLink(): TelegramBotMessage[] {
    return this.unlinkedMessages();
  }

  private async consumeLink(
    telegramId: string,
    token: string,
  ): Promise<TelegramBotMessage[]> {
    if (!token) {
      return [{ text: TELEGRAM_START_REPLIES.expired }];
    }

    try {
      const user = await this.usersGrpc.consumeTelegramLinkToken(
        { telegramId, token },
        this.internalToken(),
      );
      await this.refreshSnapshot(telegramId, user.id);
      return this.linkedMessages(TELEGRAM_START_REPLIES.linkedOk);
    } catch (error) {
      const parsed = parseRpcError(error);
      if (parsed.code === status.ALREADY_EXISTS) {
        return [{ text: TELEGRAM_START_REPLIES.conflict }];
      }
      return [{ text: TELEGRAM_START_REPLIES.expired }];
    }
  }

  private async describeLink(
    telegramId: string,
  ): Promise<TelegramBotMessage[]> {
    try {
      const user = await this.usersGrpc.getMeByTelegram(
        telegramId,
        this.internalToken(),
      );
      await this.refreshSnapshot(telegramId, user.id);
      return this.linkedMessages(TELEGRAM_START_REPLIES.alreadyLinked);
    } catch {
      return this.unlinkedMessages();
    }
  }

  private async isLinked(telegramId: string): Promise<boolean> {
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

  private linkedMessages(text: string): TelegramBotMessage[] {
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

  private unlinkedMessages(): TelegramBotMessage[] {
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

  private miniAppUrl(): string {
    return normalizeMiniAppUrl(
      this.configService.get<string>('TELEGRAM_MINI_APP_URL'),
    );
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
