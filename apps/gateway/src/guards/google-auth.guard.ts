import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard, type AuthGuardAuthenticateOptions } from '@nestjs/passport';

import type { Request } from 'express';

import { getOauthFailureRedirect } from '../helpers/oauth-failure-redirect';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly configService: ConfigService) {
    super({ session: false });
  }

  override getAuthenticateOptions(
    context: ExecutionContext,
  ): AuthGuardAuthenticateOptions {
    const request = context.switchToHttp().getRequest<Request>();

    if (request.path.endsWith('/callback')) {
      return {
        session: false,
        failureRedirect: getOauthFailureRedirect(this.configService),
      };
    }

    return { session: false };
  }
}
