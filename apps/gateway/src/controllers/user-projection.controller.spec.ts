import { Logger } from '@nestjs/common';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TelegramLinkedService } from '../services/telegram-linked.service';
import { UserProjectionService } from '../services/user-projection.service';
import { UserProjectionController } from './user-projection.controller';

describe('UserProjectionController', () => {
  const userProjection = {} as UserProjectionService;
  const telegramLinked = { publish: vi.fn() };
  let controller: UserProjectionController;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    controller = new UserProjectionController(
      userProjection,
      telegramLinked as unknown as TelegramLinkedService,
    );
  });

  it('user.telegram.updated публикует в PubSub по userId', () => {
    controller.handleUserTelegramUpdated(
      { userId: 'u1', occurredAt: '2026-09-20T00:00:00.000Z' },
      {},
    );

    expect(telegramLinked.publish).toHaveBeenCalledWith('u1');
  });

  it('без userId не публикует', () => {
    controller.handleUserTelegramUpdated(
      { userId: '', occurredAt: '2026-09-20T00:00:00.000Z' },
      {},
    );

    expect(telegramLinked.publish).not.toHaveBeenCalled();
  });
});
