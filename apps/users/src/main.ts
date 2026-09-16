import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { GRPC_LOADER_OPTIONS, usersPaymentsEventsOptions } from '@libs/common';
import { AUTH_PACKAGE, getAuthProtoPath } from '@libs/proto';

import { UsersModule } from './users.module';

async function bootstrap() {
  const app = await NestFactory.create(UsersModule, { bufferLogs: true });
  const configService = app.get(ConfigService);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: AUTH_PACKAGE,
      protoPath: getAuthProtoPath(),
      url: configService.get<string>('USERS_GRPC_URL') ?? '127.0.0.1:50051',
      loader: { ...GRPC_LOADER_OPTIONS },
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: usersPaymentsEventsOptions(
      configService.getOrThrow<string>('RABBITMQ_URL'),
    ),
  });

  await app.startAllMicroservices();
}

void bootstrap();
