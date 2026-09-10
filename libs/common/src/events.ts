export const USER_EVENTS = {
  CREATED: 'user.created',
  AUTHENTICATED: 'user.authenticated',
} as const;

export type UserEventName = (typeof USER_EVENTS)[keyof typeof USER_EVENTS];

export interface UserCreatedEvent {
  userId: string;
  email: string;
  occurredAt: string;
}

export interface UserAuthenticatedEvent {
  userId: string;
  email: string;
  method: 'password' | 'oauth' | 'refresh';
  occurredAt: string;
}
