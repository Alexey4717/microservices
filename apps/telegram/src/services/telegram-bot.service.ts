import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Request, Response } from 'express';
import { Bot, webhookCallback } from 'grammy';

import { TelegramStartService } from './telegram-start.service';

type WebhookHandler = (
  req: Request,
  res: Response,
  next: (err?: unknown) => void,
) => void | Promise<void>;

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot!: Bot;
  private webhookHandler!: WebhookHandler;

  constructor(
    private readonly configService: ConfigService,
    private readonly telegramStart: TelegramStartService,
  ) {}

  onModuleInit(): void {
    const token = this.configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    const secret = this.configService.getOrThrow<string>(
      'TELEGRAM_WEBHOOK_SECRET',
    );

    this.bot = new Bot(token);
    this.bot.catch((err) => {
      this.logger.error(`Ошибка обработки update: ${err.message}`);
    });
    this.bot.command('start', async (ctx) => {
      const telegramId = ctx.from?.id != null ? String(ctx.from.id) : '';
      const payload = typeof ctx.match === 'string' ? ctx.match : '';
      const text = await this.telegramStart.handleStart(telegramId, payload);
      await ctx.reply(text);
    });

    this.webhookHandler = webhookCallback(this.bot, 'express', {
      secretToken: secret,
      onTimeout: 'return',
      timeoutMilliseconds: 30_000,
    });
  }

  async registerWebhook(): Promise<void> {
    const webhookUrl = this.configService.get<string>('TELEGRAM_WEBHOOK_URL');
    if (!webhookUrl) {
      this.logger.log('TELEGRAM_WEBHOOK_URL пуст — setWebhook пропущен');
      return;
    }

    const secret = this.configService.getOrThrow<string>(
      'TELEGRAM_WEBHOOK_SECRET',
    );
    await this.bot.api.setWebhook(webhookUrl, { secret_token: secret });
    let host = 'invalid-url';
    try {
      host = new URL(webhookUrl).host;
    } catch {
      // keep invalid-url
    }
    this.logger.log(`Telegram webhook зарегистрирован (${host})`);
  }

  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      await this.webhookHandler(req, res, () => undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.error(`Webhook handler failed: ${message}`);
      if (!res.headersSent) {
        res.status(500).end();
      }
    }
  }
}
