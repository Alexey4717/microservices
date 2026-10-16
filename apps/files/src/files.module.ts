import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { InternalTokenInterceptor, validateFilesEnv } from '@libs/common';

import { FilesController } from './controllers/files.controller';
import { HealthController } from './controllers/health.controller';
import { CompleteVideoUploadUseCase } from './services/complete-video-upload.use-case';
import { CreateVideoUploadUseCase } from './services/create-video-upload.use-case';
import { FilesService } from './services/files.service';
import { GetVideoUseCase } from './services/get-video.use-case';
import { ListVideosUseCase } from './services/list-videos.use-case';
import { PrismaService } from './services/prisma.service';
import { StorageService } from './services/storage.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateFilesEnv,
    }),
  ],
  controllers: [HealthController, FilesController],
  providers: [
    PrismaService,
    StorageService,
    FilesService,
    CreateVideoUploadUseCase,
    CompleteVideoUploadUseCase,
    ListVideosUseCase,
    GetVideoUseCase,
    {
      provide: APP_INTERCEPTOR,
      useClass: InternalTokenInterceptor,
    },
  ],
})
export class FilesModule {}
