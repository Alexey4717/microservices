import { Injectable } from '@nestjs/common';

import { status } from '@grpc/grpc-js';

import { parseRpcError } from '@libs/common';

import { type TelegramBotMessage } from '../helpers/telegram-bot-message';
import {
  TELEGRAM_START_LINK_PREFIX,
  TELEGRAM_START_REPLIES,
} from '../helpers/telegram-mini-app';
import { TelegramStartHelper } from './telegram-start.helper';
import { UsersGrpcService } from './users-grpc.service';

@Injectable()
export class HandleStartUseCase {
  constructor(
    private readonly usersGrpc: UsersGrpcService,
    private readonly startHelper: TelegramStartHelper,
  ) {}

  async execute(
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
        this.startHelper.internalToken(),
      );
      await this.startHelper.refreshSnapshot(telegramId, user.id);
      return this.startHelper.linkedMessages(TELEGRAM_START_REPLIES.linkedOk);
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
        this.startHelper.internalToken(),
      );
      await this.startHelper.refreshSnapshot(telegramId, user.id);
      return this.startHelper.linkedMessages(
        TELEGRAM_START_REPLIES.alreadyLinked,
      );
    } catch {
      return this.startHelper.unlinkedMessages();
    }
  }
}
