import { describe, expect, it } from 'vitest';

import { isOwnTelegramLinkedEvent } from './telegram-linked-filter';

describe('isOwnTelegramLinkedEvent', () => {
  it('пропускает событие только своему JWT userId', () => {
    expect(
      isOwnTelegramLinkedEvent(
        { userId: 'u1' },
        {},
        { req: { user: { userId: 'u1' } } },
      ),
    ).toBe(true);
  });

  it('не доверяет чужому userId в payload', () => {
    expect(
      isOwnTelegramLinkedEvent(
        { userId: 'u2' },
        {},
        { req: { user: { userId: 'u1' } } },
      ),
    ).toBe(false);
  });

  it('без JWT не отдаёт события', () => {
    expect(isOwnTelegramLinkedEvent({ userId: 'u1' }, {}, {})).toBe(false);
  });
});
