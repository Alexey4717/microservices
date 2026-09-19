import { describe, expect, it } from 'vitest';

import {
  MAILER_USERS_EVENTS_MAX_LENGTH,
  MAILER_WELCOME_EVENT_TTL_MS,
  gatewayUserProjectionsOptions,
  mailerUsersEventsOptions,
  usersPaymentsEventsOptions,
} from './events';

describe('RMQ consumer options', () => {
  it('ставит TTL и потолок длины, чтобы очередь не росла без consumer', () => {
    expect(mailerUsersEventsOptions('amqp://localhost').queueOptions).toEqual({
      durable: true,
      arguments: {
        'x-message-ttl': MAILER_WELCOME_EVENT_TTL_MS,
        'x-max-length': MAILER_USERS_EVENTS_MAX_LENGTH,
        'x-overflow': 'drop-head',
      },
    });
  });

  it('требует ручной ack и prefetch=1 (иначе consumer_timeout RabbitMQ)', () => {
    const consumers = [
      mailerUsersEventsOptions('amqp://localhost'),
      gatewayUserProjectionsOptions('amqp://localhost'),
      usersPaymentsEventsOptions('amqp://localhost'),
    ];
    for (const options of consumers) {
      expect(options.noAck).toBe(false);
      expect(options.prefetchCount).toBe(1);
    }
  });
});
