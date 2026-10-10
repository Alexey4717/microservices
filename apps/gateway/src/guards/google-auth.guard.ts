import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard, type AuthGuardAuthenticateOptions } from '@nestjs/passport';

import type { Request, Response } from 'express';

import {
  describeErrorForLog,
  getOauthAuthenticateOptions,
  oauthFailureRedirectFor,
} from '../helpers/oauth-failure-redirect';
import type { OauthProfile } from '../types/auth.types';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  constructor(private readonly configService: ConfigService) {
    super({ session: false });
  }

  override getAuthenticateOptions(
    context: ExecutionContext,
  ): AuthGuardAuthenticateOptions {
    const request = context.switchToHttp().getRequest<Request>();
    return getOauthAuthenticateOptions(request, this.configService);
  }

  override handleRequest<TUser = OauthProfile>(
    err: unknown,
    user: TUser,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (!err && user) {
      return user;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    if (request.path.endsWith('/callback') && !response.headersSent) {
      this.logger.error(describeErrorForLog(err));
      response.redirect(oauthFailureRedirectFor(request, this.configService));
    }

    return undefined as TUser;
  }
}
