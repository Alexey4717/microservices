export const USER_EVENTS = {
  CREATED: 'user.created',
  UPDATED: 'user.updated',
  AUTHENTICATED: 'user.authenticated',
} as const;

export const USERS_EVENTS_EXCHANGE = 'users.events';
export const USERS_EVENTS_EXCHANGE_TYPE = 'topic' as const;
export const MAILER_USERS_EVENTS_QUEUE = 'mailer.users-events';
export const GATEWAY_USER_PROJECTIONS_QUEUE = 'gateway.user-projections';

export type UserEventName = (typeof USER_EVENTS)[keyof typeof USER_EVENTS];

export type UserPublicProfilePayload = {
  userId: string;
  email: string;
  name: string;
  avatarUrl: string;
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
    queueOptions: { durable: true },
    noAck: false,
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
    exchange: USERS_EVENTS_EXCHANGE,
    exchangeType: USERS_EVENTS_EXCHANGE_TYPE,
    wildcards: true,
    routingKey: 'user.#',
  };
}
