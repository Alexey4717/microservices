import { describe, expect, it } from 'vitest';

import { isStaleUserCreatedEvent } from './welcome-event';

describe('isStaleUserCreatedEvent', () => {
  const nowMs = Date.parse('2026-09-16T10:00:00.000Z');

  it('свежее событие не считается устаревшим', () => {
    expect(
      isStaleUserCreatedEvent(
        { occurredAt: '2026-09-16T09:30:00.000Z' },
        nowMs,
      ),
    ).toBe(false);
  });

  it('событие старше 24 ч пропускается', () => {
    expect(
      isStaleUserCreatedEvent(
        { occurredAt: '2026-09-14T10:00:00.000Z' },
        nowMs,
      ),
    ).toBe(true);
  });

  it('невалидный occurredAt пропускается, чтобы не травить очередь', () => {
    expect(isStaleUserCreatedEvent({ occurredAt: '' }, nowMs)).toBe(true);
    expect(isStaleUserCreatedEvent({ occurredAt: 'not-a-date' }, nowMs)).toBe(
      true,
    );
  });
});
