import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MailerController } from './mailer.controller';

function createdEvent(
  overrides: Partial<{
    userId: string;
    email: string;
    occurredAt: string;
  }> = {},
) {
  return {
    userId: 'u1',
    email: 'a@example.com',
    name: '',
    avatarUrl: '',
    accountTier: 'BASE',
    occurredAt: new Date().toISOString(),
    ...overrides,
  };
}

function rmqContext() {
  const ack = vi.fn();
  const context = {
    getChannelRef: () => ({ ack, nack: vi.fn() }),
    getMessage: () => ({ fields: { deliveryTag: 1 } }),
  };
  return { ack, context };
}

describe('MailerController', () => {
  const sendWelcome = vi.fn();
  let controller: MailerController;

  beforeEach(() => {
    vi.clearAllMocks();
    sendWelcome.mockResolvedValue(undefined);
    controller = new MailerController({ sendWelcome } as never);
  });

  it('отправляет welcome для свежего user.created', async () => {
    const { ack, context } = rmqContext();
    await controller.handleUserCreated(createdEvent(), context);
    expect(sendWelcome).toHaveBeenCalledWith('a@example.com');
    expect(ack).toHaveBeenCalledTimes(1);
  });

  it('не ходит в SMTP для старого события', async () => {
    const { ack, context } = rmqContext();
    await controller.handleUserCreated(
      createdEvent({ occurredAt: '2020-01-01T00:00:00.000Z' }),
      context,
    );
    expect(sendWelcome).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledTimes(1);
  });

  it('не ходит в SMTP при невалидном email', async () => {
    const { ack, context } = rmqContext();
    await controller.handleUserCreated(
      createdEvent({ email: 'not-an-email' }),
      context,
    );
    expect(sendWelcome).not.toHaveBeenCalled();
    expect(ack).toHaveBeenCalledTimes(1);
  });

  it('ошибка SMTP не пробрасывается — сообщение будет ack', async () => {
    const { ack, context } = rmqContext();
    sendWelcome.mockRejectedValue(new Error('gmail 550'));
    await expect(
      controller.handleUserCreated(createdEvent({ userId: 'u2' }), context),
    ).resolves.toBeUndefined();
    expect(ack).toHaveBeenCalledTimes(1);
  });
});
