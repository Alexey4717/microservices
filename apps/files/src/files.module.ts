import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { InternalTokenInterceptor, validateFilesEnv } from '@libs/common';

import { FilesController } from './controllers/files.controller';
import { HealthController } from './controllers/health.controller';
import { FilesService } from './services/files.service';
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
    {
      provide: APP_INTERCEPTOR,
      useClass: InternalTokenInterceptor,
    },
  ],
})
export class FilesModule {}
