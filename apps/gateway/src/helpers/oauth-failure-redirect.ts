import { ConfigService } from '@nestjs/config';
import type { AuthGuardAuthenticateOptions } from '@nestjs/passport';

import type { Request } from 'express';

const DEFAULT_WEB_ORIGIN = 'http://localhost:4000';

export const MOBILE_OAUTH_STATE = 'mobile';

export const MOBILE_OAUTH_FAILURE_REDIRECT = 'mobile://login?error=oauth';

const DEFAULT_MOBILE_OAUTH_SUCCESS_REDIRECT = 'mobile://auth/callback';

export function getOauthFailureRedirect(configService: ConfigService): string {
  const successRedirect = configService.get<string>(
    'OAUTH_SUCCESS_REDIRECT_URL',
  );
  const corsOrigin =
    configService.get<string>('CORS_ORIGIN') ?? DEFAULT_WEB_ORIGIN;
  const origin =
    originFromUrl(successRedirect) ??
    originFromUrl(corsOrigin) ??
    DEFAULT_WEB_ORIGIN;

  return `${origin}/login?error=oauth`;
}

export function isMobileOauthRequest(request: Request): boolean {
  return queryString(request.query.client) === MOBILE_OAUTH_STATE;
}

export function isMobileOauthCallback(request: Request): boolean {
  return queryString(request.query.state) === MOBILE_OAUTH_STATE;
}

export function oauthFailureRedirectFor(
  request: Request,
  configService: ConfigService,
): string {
  if (isMobileOauthCallback(request)) {
    return MOBILE_OAUTH_FAILURE_REDIRECT;
  }

  return getOauthFailureRedirect(configService);
}

export function getOauthAuthenticateOptions(
  request: Request,
  configService: ConfigService,
): AuthGuardAuthenticateOptions {
  if (request.path.endsWith('/callback')) {
    return {
      session: false,
      failureRedirect: oauthFailureRedirectFor(request, configService),
    };
  }

  if (isMobileOauthRequest(request)) {
    return { session: false, state: MOBILE_OAUTH_STATE };
  }

  return { session: false };
}

export function oauthSuccessRedirectFor(
  request: Request,
  configService: ConfigService,
): string | undefined {
  if (isMobileOauthCallback(request)) {
    return (
      configService.get<string>('MOBILE_OAUTH_SUCCESS_REDIRECT_URL') ??
      DEFAULT_MOBILE_OAUTH_SUCCESS_REDIRECT
    );
  }

  return configService.get<string>('OAUTH_SUCCESS_REDIRECT_URL');
}

function queryString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }

  return undefined;
}

function originFromUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}
