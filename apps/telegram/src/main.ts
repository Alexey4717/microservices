import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { TelegramBotService } from './services/telegram-bot.service';
import { TelegramModule } from './telegram.module';

async function bootstrap() {
  const app = await NestFactory.create(TelegramModule, { bufferLogs: true });
  const configService = app.get(ConfigService);

  const port = configService.get<number>('TELEGRAM_PORT') ?? 3004;
  const host = configService.get<string>('TELEGRAM_HOST') ?? '127.0.0.1';
  await app.listen(port, host);
  await app.get(TelegramBotService).registerWebhook();
}

void bootstrap();
