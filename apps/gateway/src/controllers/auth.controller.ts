import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Request, Response } from 'express';

import { GithubAuthGuard } from '../guards/github-auth.guard';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { AuthService } from '../services/auth.service';
import type { OauthProfile } from '../types/auth.types';
import { renderOauthSuccessHtml } from './oauth-success.html';

@Controller('auth')
export class AuthController {
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
    await this.finishOauth(req.user, res);
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
    await this.finishOauth(req.user, res);
  }

  private async finishOauth(
    profile: OauthProfile,
    res: Response,
  ): Promise<void> {
    const tokens = await this.authService.oauthUpsert(profile);
    const redirectBase = this.configService.get<string>(
      'OAUTH_SUCCESS_REDIRECT_URL',
    );

    if (redirectBase) {
      const url = new URL(redirectBase);
      url.hash = `accessToken=${encodeURIComponent(tokens.accessToken)}&refreshToken=${encodeURIComponent(tokens.refreshToken)}`;
      res.redirect(url.toString());
      return;
    }

    res
      .status(200)
      .type('html')
      .send(renderOauthSuccessHtml(tokens.accessToken, tokens.refreshToken));
  }
}
