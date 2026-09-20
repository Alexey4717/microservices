import { Controller, Post, Req, Res } from '@nestjs/common';

import type { Request, Response } from 'express';

import { TelegramBotService } from '../services/telegram-bot.service';

@Controller()
export class WebhooksController {
  constructor(private readonly telegramBot: TelegramBotService) {}

  @Post('webhooks/telegram')
  async telegram(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.telegramBot.handleWebhook(req, res);
  }
}
