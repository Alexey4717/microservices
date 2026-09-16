import { describe, expect, it } from 'vitest';

import {
  MAILER_USERS_EVENTS_MAX_LENGTH,
  MAILER_WELCOME_EVENT_TTL_MS,
  mailerUsersEventsOptions,
} from './events';

describe('mailerUsersEventsOptions', () => {
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
});
