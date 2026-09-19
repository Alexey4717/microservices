export type RmqAckChannel = {
  ack: (message: unknown) => void;
  nack: (message: unknown, allUpTo?: boolean, requeue?: boolean) => void;
};

export type RmqAckContext = {
  getChannelRef: () => RmqAckChannel;
  getMessage: () => unknown;
};

export function isRmqAckContext(value: unknown): value is RmqAckContext {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as RmqAckContext).getChannelRef === 'function' &&
    typeof (value as RmqAckContext).getMessage === 'function'
  );
}

/** Nest при `noAck: false` сам не ack'ает — иначе RabbitMQ через 30 мин рвёт канал (consumer_timeout). */
export function ackRmqMessage(context: unknown): void {
  if (!isRmqAckContext(context)) {
    return;
  }
  try {
    context.getChannelRef().ack(context.getMessage());
  } catch {
    // канал уже закрыт или delivery tag недействителен
  }
}

export function nackRmqMessage(context: unknown, requeue = true): void {
  if (!isRmqAckContext(context)) {
    return;
  }
  try {
    context.getChannelRef().nack(context.getMessage(), false, requeue);
  } catch {
    // канал уже закрыт или delivery tag недействителен
  }
}
