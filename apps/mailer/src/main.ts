import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { USERS_EVENTS_QUEUE } from '@libs/common';

import { MailerModule } from './mailer.module';

async function bootstrap() {
  const app = await NestFactory.create(MailerModule, { bufferLogs: true });
  const configService = app.get(ConfigService);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [configService.getOrThrow<string>('RABBITMQ_URL')],
      queue: USERS_EVENTS_QUEUE,
      queueOptions: { durable: true },
    },
  });

  await app.startAllMicroservices();

  const port = configService.get<number>('MAILER_PORT') ?? 3001;
  const host = configService.get<string>('MAILER_HOST') ?? '127.0.0.1';
  await app.listen(port, host);
}

void bootstrap();
