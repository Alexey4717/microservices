import { describe, expect, it } from 'vitest';

import { TelegramLinkedService } from './telegram-linked.service';

describe('TelegramLinkedService', () => {
  it('публикует ok для подписчиков', async () => {
    const service = new TelegramLinkedService();
    const iterator = service.asyncIterator();
    const pending = iterator.next();
    service.publish('u1');

    await expect(pending).resolves.toMatchObject({
      done: false,
      value: { userId: 'u1', telegramLinked: { ok: true } },
    });

    await iterator.return?.();
  });
});
