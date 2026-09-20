import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateTelegramEnv } from '@libs/common';

import { HealthController } from './controllers/health.controller';
import { WebhooksController } from './controllers/webhooks.controller';
import { FilesGrpcModule } from './grpc/files-grpc.module';
import { UsersGrpcModule } from './grpc/users-grpc.module';
import { TelegramApiService } from './services/telegram-api.service';
import { TelegramBotService } from './services/telegram-bot.service';
import { TelegramProfileService } from './services/telegram-profile.service';
import { TelegramStartService } from './services/telegram-start.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateTelegramEnv,
    }),
    UsersGrpcModule,
    FilesGrpcModule,
  ],
  controllers: [HealthController, WebhooksController],
  providers: [
    TelegramApiService,
    TelegramProfileService,
    TelegramStartService,
    TelegramBotService,
  ],
})
export class TelegramModule {}
