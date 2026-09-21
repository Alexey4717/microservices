import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { graphqlUploadExpress } from 'graphql-upload-ts';

import { gatewayUserProjectionsOptions } from '@libs/common';

import { AppModule } from './app.module';
import { resolveGatewayCorsOrigins } from './helpers/cors-origins';
import { registerGraphqlSse } from './helpers/register-graphql-sse';

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
    origin: resolveGatewayCorsOrigins(
      configService.get<string>('CORS_ORIGIN'),
      configService.get<string>('TELEGRAM_MINI_APP_URL'),
    ),
    credentials: true,
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Apollo-Require-Preflight',
      'Accept',
      'Origin',
      'Last-Event-ID',
    ],
  });

  // До init/Apollo, иначе expressMiddleware перехватит text/event-stream.
  registerGraphqlSse(app);

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
