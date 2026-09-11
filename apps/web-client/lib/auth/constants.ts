export const REFRESH_COOKIE_NAME = 'refresh-token';

/** Request header set by `proxy.ts` after a successful refresh. Incoming client values are stripped. */
export const ACCESS_TOKEN_HEADER = 'x-access-token';

/** Request header with the public user payload from the same refresh. Incoming client values are stripped. */
export const SESSION_USER_HEADER = 'x-session-user';
