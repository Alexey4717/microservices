export const USER_EVENTS = {
  CREATED: 'user.created',
  UPDATED: 'user.updated',
  AUTHENTICATED: 'user.authenticated',
} as const;

export const USERS_EVENTS_EXCHANGE = 'users.events';
export const USERS_EVENTS_EXCHANGE_TYPE = 'topic' as const;
export const MAILER_USERS_EVENTS_QUEUE = 'mailer.users-events';
export const GATEWAY_USER_PROJECTIONS_QUEUE = 'gateway.user-projections';
export const MAILER_WELCOME_EVENT_TTL_MS = 24 * 60 * 60 * 1000;
export const MAILER_USERS_EVENTS_MAX_LENGTH = 10_000;

export type UserEventName = (typeof USER_EVENTS)[keyof typeof USER_EVENTS];

export type UserPublicProfilePayload = {
  userId: string;
  email: string;
  name: string;
  avatarUrl: string;
  accountTier: string;
  occurredAt: string;
};

export type UserCreatedEvent = UserPublicProfilePayload;
export type UserUpdatedEvent = UserPublicProfilePayload;

export interface UserAuthenticatedEvent {
  userId: string;
  email: string;
  method: 'password' | 'oauth' | 'refresh';
  occurredAt: string;
}

export function usersEventsPublisherOptions(url: string) {
  return {
    urls: [url],
    exchange: USERS_EVENTS_EXCHANGE,
    exchangeType: USERS_EVENTS_EXCHANGE_TYPE,
    wildcards: true,
    persistent: true,
  };
}

export function mailerUsersEventsOptions(url: string) {
  return {
    urls: [url],
    queue: MAILER_USERS_EVENTS_QUEUE,
    queueOptions: {
      durable: true,
      arguments: {
        'x-message-ttl': MAILER_WELCOME_EVENT_TTL_MS,
        'x-max-length': MAILER_USERS_EVENTS_MAX_LENGTH,
        'x-overflow': 'drop-head',
      },
    },
    // Nest 12 при false не ack'ает сам — consumer обязан вызвать ackRmqMessage.
    noAck: false,
    prefetchCount: 1,
    exchange: USERS_EVENTS_EXCHANGE,
    exchangeType: USERS_EVENTS_EXCHANGE_TYPE,
    routingKey: USER_EVENTS.CREATED,
  };
}

export function gatewayUserProjectionsOptions(url: string) {
  return {
    urls: [url],
    queue: GATEWAY_USER_PROJECTIONS_QUEUE,
    queueOptions: { durable: true },
    noAck: false,
    prefetchCount: 1,
    exchange: USERS_EVENTS_EXCHANGE,
    exchangeType: USERS_EVENTS_EXCHANGE_TYPE,
    wildcards: true,
    routingKey: 'user.#',
  };
}

export const PAYMENT_EVENTS = {
  COMPLETED: 'payment.completed',
  FAILED: 'payment.failed',
  CANCELED: 'payment.canceled',
} as const;

export const PAYMENTS_EVENTS_EXCHANGE = 'payments.events';
export const PAYMENTS_EVENTS_EXCHANGE_TYPE = 'topic' as const;
export const USERS_PAYMENTS_EVENTS_QUEUE = 'users.payments-events';

export type PaymentEventName =
  (typeof PAYMENT_EVENTS)[keyof typeof PAYMENT_EVENTS];

export type PaymentEventPayload = {
  paymentId: string;
  userId: string;
  productCode: string;
  provider: string;
  status: string;
  occurredAt: string;
};

export function paymentsEventsPublisherOptions(url: string) {
  return {
    urls: [url],
    exchange: PAYMENTS_EVENTS_EXCHANGE,
    exchangeType: PAYMENTS_EVENTS_EXCHANGE_TYPE,
    wildcards: true,
    persistent: true,
  };
}

export function usersPaymentsEventsOptions(url: string) {
  return {
    urls: [url],
    queue: USERS_PAYMENTS_EVENTS_QUEUE,
    queueOptions: { durable: true },
    noAck: false,
    prefetchCount: 1,
    exchange: PAYMENTS_EVENTS_EXCHANGE,
    exchangeType: PAYMENTS_EVENTS_EXCHANGE_TYPE,
    routingKey: PAYMENT_EVENTS.COMPLETED,
  };
}
