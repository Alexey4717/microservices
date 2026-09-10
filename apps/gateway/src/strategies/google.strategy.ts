import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import { type Profile, Strategy } from 'passport-google-oauth20';

import type { OauthProfile } from '../types/auth.types';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    const clientID =
      configService.get<string>('GOOGLE_CLIENT_ID') || 'not-configured';
    const clientSecret =
      configService.get<string>('GOOGLE_CLIENT_SECRET') || 'not-configured';
    const baseUrl =
      configService.get<string>('OAUTH_CALLBACK_BASE_URL') ??
      'http://localhost:3000';

    super({
      clientID,
      clientSecret,
      callbackURL: `${baseUrl.replace(/\/$/, '')}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): OauthProfile {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new UnauthorizedException('Google не вернул email');
    }

    return {
      provider: 'google',
      providerAccountId: profile.id,
      email,
      name: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value,
    };
  }
}
