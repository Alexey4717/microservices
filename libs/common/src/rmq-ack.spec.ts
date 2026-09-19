import { describe, expect, it, vi } from 'vitest';

import { ackRmqMessage, isRmqAckContext, nackRmqMessage } from './rmq-ack';

function contextWith(channel: {
  ack: (message: unknown) => void;
  nack: (message: unknown, allUpTo?: boolean, requeue?: boolean) => void;
}) {
  const message = { id: 'm1' };
  return {
    channel,
    message,
    context: {
      getChannelRef: () => channel,
      getMessage: () => message,
    },
  };
}

describe('ackRmqMessage / nackRmqMessage', () => {
  it('ack передаёт исходное сообщение в канал', () => {
    const channel = {
      ack: vi.fn<(message: unknown) => void>(),
      nack: vi.fn<
        (message: unknown, allUpTo?: boolean, requeue?: boolean) => void
      >(),
    };
    const { context, message } = contextWith(channel);

    ackRmqMessage(context);

    expect(channel.ack).toHaveBeenCalledWith(message);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('nack без повторной постановки в очередь, если requeue=false', () => {
    const channel = {
      ack: vi.fn<(message: unknown) => void>(),
      nack: vi.fn<
        (message: unknown, allUpTo?: boolean, requeue?: boolean) => void
      >(),
    };
    const { context, message } = contextWith(channel);

    nackRmqMessage(context, false);

    expect(channel.nack).toHaveBeenCalledWith(message, false, false);
  });

  it('не пробрасывает ошибку канала', () => {
    const channel = {
      ack: (_message: unknown) => {
        throw new Error('Channel closed');
      },
      nack: vi.fn<
        (message: unknown, allUpTo?: boolean, requeue?: boolean) => void
      >(),
    };
    const { context } = contextWith(channel);

    expect(() => ackRmqMessage(context)).not.toThrow();
  });

  it('игнорирует не-RMQ контекст', () => {
    expect(isRmqAckContext({})).toBe(false);
    expect(() => ackRmqMessage({})).not.toThrow();
  });
});
