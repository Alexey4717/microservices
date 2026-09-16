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

describe('MailerController', () => {
  const sendWelcome = vi.fn();
  let controller: MailerController;

  beforeEach(() => {
    vi.clearAllMocks();
    sendWelcome.mockResolvedValue(undefined);
    controller = new MailerController({ sendWelcome } as never);
  });

  it('отправляет welcome для свежего user.created', async () => {
    await controller.handleUserCreated(createdEvent());
    expect(sendWelcome).toHaveBeenCalledWith('a@example.com');
  });

  it('не ходит в SMTP для старого события', async () => {
    await controller.handleUserCreated(
      createdEvent({ occurredAt: '2020-01-01T00:00:00.000Z' }),
    );
    expect(sendWelcome).not.toHaveBeenCalled();
  });

  it('не ходит в SMTP при невалидном email', async () => {
    await controller.handleUserCreated(createdEvent({ email: 'not-an-email' }));
    expect(sendWelcome).not.toHaveBeenCalled();
  });

  it('ошибка SMTP не пробрасывается — сообщение будет ack', async () => {
    sendWelcome.mockRejectedValue(new Error('gmail 550'));
    await expect(
      controller.handleUserCreated(createdEvent({ userId: 'u2' })),
    ).resolves.toBeUndefined();
  });
});
