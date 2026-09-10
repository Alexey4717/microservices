import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import { type Profile, Strategy } from 'passport-github2';

import type { OauthProfile } from '../types/auth.types';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(configService: ConfigService) {
    const clientID =
      configService.get<string>('GITHUB_CLIENT_ID') || 'not-configured';
    const clientSecret =
      configService.get<string>('GITHUB_CLIENT_SECRET') || 'not-configured';
    const baseUrl =
      configService.get<string>('OAUTH_CALLBACK_BASE_URL') ??
      'http://localhost:3000';

    super({
      clientID,
      clientSecret,
      callbackURL: `${baseUrl.replace(/\/$/, '')}/auth/github/callback`,
      scope: ['user:email'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): OauthProfile {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new UnauthorizedException('GitHub не вернул email');
    }

    return {
      provider: 'github',
      providerAccountId: profile.id,
      email,
      name: profile.displayName ?? profile.username,
      avatarUrl: profile.photos?.[0]?.value,
    };
  }
}
