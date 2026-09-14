import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { graphqlUploadExpress } from 'graphql-upload-ts';

import { gatewayUserProjectionsOptions } from '@libs/common';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.use(
    graphqlUploadExpress({
      maxFileSize: 2 * 1024 * 1024,
      maxFiles: 1,
      overrideSendResponse: false,
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const configService = app.get(ConfigService);

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN') ?? 'http://localhost:4000',
    credentials: true,
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: gatewayUserProjectionsOptions(
      configService.getOrThrow<string>('RABBITMQ_URL'),
    ),
  });

  await app.startAllMicroservices();

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
}

void bootstrap();
