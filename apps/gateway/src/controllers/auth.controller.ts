import { Controller, Get, Logger, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Request, Response } from 'express';

import { GithubAuthGuard } from '../guards/github-auth.guard';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import {
  oauthSuccessRedirectFor,
  parseOauthRedirectUrl,
} from '../helpers/oauth-failure-redirect';
import { AuthService } from '../services/auth.service';
import type { OauthProfile } from '../types/auth.types';
import { renderOauthSuccessHtml } from './oauth-success.html';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth(): void {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @Req() req: Request & { user: OauthProfile },
    @Res() res: Response,
  ): Promise<void> {
    await this.finishOauth(req.user, req, res);
  }

  @Get('github')
  @UseGuards(GithubAuthGuard)
  githubAuth(): void {}

  @Get('github/callback')
  @UseGuards(GithubAuthGuard)
  async githubCallback(
    @Req() req: Request & { user: OauthProfile },
    @Res() res: Response,
  ): Promise<void> {
    await this.finishOauth(req.user, req, res);
  }

  private async finishOauth(
    profile: OauthProfile,
    req: Request,
    res: Response,
  ): Promise<void> {
    if (res.headersSent || !profile?.email || !profile.providerAccountId) {
      return;
    }

    const tokens = await this.authService.oauthUpsert(profile);
    const redirectBase = oauthSuccessRedirectFor(req, this.configService);
    const redirectUrl = parseOauthRedirectUrl(redirectBase);
    if (redirectBase && !redirectUrl) {
      this.logger.error(
        'OAUTH_SUCCESS_REDIRECT_URL is not an absolute URL, tokens are returned in HTML',
      );
    }

    if (redirectUrl) {
      redirectUrl.hash = `accessToken=${encodeURIComponent(tokens.accessToken)}&refreshToken=${encodeURIComponent(tokens.refreshToken)}`;
      res.redirect(redirectUrl.toString());
      return;
    }

    res
      .status(200)
      .type('html')
      .send(renderOauthSuccessHtml(tokens.accessToken, tokens.refreshToken));
  }
}
