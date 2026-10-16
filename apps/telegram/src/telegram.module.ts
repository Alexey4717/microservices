import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateTelegramEnv } from '@libs/common';

import { HealthController } from './controllers/health.controller';
import { WebhooksController } from './controllers/webhooks.controller';
import { FilesGrpcModule } from './grpc/files-grpc.module';
import { UsersGrpcModule } from './grpc/users-grpc.module';
import { HandleHowToLinkUseCase } from './services/handle-how-to-link.use-case';
import { HandleMyVideosUseCase } from './services/handle-my-videos.use-case';
import { HandleStartUseCase } from './services/handle-start.use-case';
import { TelegramApiService } from './services/telegram-api.service';
import { TelegramBotService } from './services/telegram-bot.service';
import { TelegramProfileService } from './services/telegram-profile.service';
import { TelegramStartHelper } from './services/telegram-start.helper';

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
    TelegramStartHelper,
    HandleStartUseCase,
    HandleMyVideosUseCase,
    HandleHowToLinkUseCase,
    TelegramBotService,
  ],
})
export class TelegramModule {}
