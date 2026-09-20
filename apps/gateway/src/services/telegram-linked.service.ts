import { Injectable } from '@nestjs/common';

import { PubSub } from 'graphql-subscriptions';

import type { TelegramLinkedPayload } from '../models/telegram-linked.model';

export const TELEGRAM_LINKED_TRIGGER = 'telegramLinked';

export type TelegramLinkedEvent = {
  telegramLinked: TelegramLinkedPayload;
  userId: string;
};

@Injectable()
export class TelegramLinkedService {
  private readonly pubSub = new PubSub();

  publish(userId: string): void {
    void this.pubSub.publish(TELEGRAM_LINKED_TRIGGER, {
      telegramLinked: { ok: true },
      userId,
    } satisfies TelegramLinkedEvent);
  }

  asyncIterator(): AsyncIterableIterator<TelegramLinkedEvent> {
    return this.pubSub.asyncIterableIterator(TELEGRAM_LINKED_TRIGGER);
  }
}
