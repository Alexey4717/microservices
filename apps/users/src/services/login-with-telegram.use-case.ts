import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AuthResponse } from '@libs/proto';

import {
  type TelegramWebAppInitDataRequest,
  parseTelegramWebAppUserId,
} from '../helpers/telegram-webapp-init-data';
import { AuthSupportHelper } from './auth-support.helper';
import { GetMeByTelegramUseCase } from './get-me-by-telegram.use-case';

@Injectable()
export class LoginWithTelegramUseCase {
  constructor(
    private readonly configService: ConfigService,
    private readonly authSupport: AuthSupportHelper,
    private readonly getMeByTelegram: GetMeByTelegramUseCase,
  ) {}

  async execute({
    initData,
  }: TelegramWebAppInitDataRequest): Promise<AuthResponse> {
    const botToken =
      this.configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    const telegramId = parseTelegramWebAppUserId(initData, botToken);
    const user = await this.getMeByTelegram.execute({ telegramId });
    this.authSupport.emitAuthenticated(user.id, user.email, 'oauth');
    const tokens = await this.authSupport.issueTokens(user.id, user.email);
    return { ...tokens, user };
  }
}
