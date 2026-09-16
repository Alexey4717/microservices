import {
  MAILER_WELCOME_EVENT_TTL_MS,
  type UserCreatedEvent,
} from '@libs/common';

export function isStaleUserCreatedEvent(
  payload: Pick<UserCreatedEvent, 'occurredAt'>,
  nowMs = Date.now(),
): boolean {
  const occurredAt = Date.parse(payload.occurredAt ?? '');
  if (Number.isNaN(occurredAt)) {
    return true;
  }
  return nowMs - occurredAt > MAILER_WELCOME_EVENT_TTL_MS;
}
