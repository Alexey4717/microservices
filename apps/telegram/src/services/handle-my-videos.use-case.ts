import { Injectable } from '@nestjs/common';

import { type TelegramBotMessage } from '../helpers/telegram-bot-message';
import { openVideosInlineKeyboard } from '../helpers/telegram-keyboards';
import { TELEGRAM_START_REPLIES } from '../helpers/telegram-mini-app';
import { TelegramStartHelper } from './telegram-start.helper';

@Injectable()
export class HandleMyVideosUseCase {
  constructor(private readonly startHelper: TelegramStartHelper) {}

  async execute(telegramId: string): Promise<TelegramBotMessage[]> {
    if (!telegramId) {
      return [{ text: TELEGRAM_START_REPLIES.missingId }];
    }

    const linked = await this.startHelper.isLinked(telegramId);
    const miniAppUrl = this.startHelper.miniAppUrl();
    if (!linked) {
      return this.startHelper.unlinkedMessages();
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
}
