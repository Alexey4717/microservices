import { Injectable } from '@nestjs/common';

import { type TelegramBotMessage } from '../helpers/telegram-bot-message';
import { TelegramStartHelper } from './telegram-start.helper';

@Injectable()
export class HandleHowToLinkUseCase {
  constructor(private readonly startHelper: TelegramStartHelper) {}

  execute(): TelegramBotMessage[] {
    return this.startHelper.unlinkedMessages();
  }
}
