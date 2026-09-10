import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { config } from 'dotenv';

import { GRPC_LOADER_OPTIONS } from '@libs/common';
import { AUTH_PACKAGE, getAuthProtoPath } from '@libs/proto';

import { UsersModule } from './users.module';

config();

async function bootstrap() {
  const grpcUrl = process.env.USERS_GRPC_URL ?? '127.0.0.1:50051';

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    UsersModule,
    {
      transport: Transport.GRPC,
      options: {
        package: AUTH_PACKAGE,
        protoPath: getAuthProtoPath(),
        url: grpcUrl,
        loader: { ...GRPC_LOADER_OPTIONS },
      },
    },
  );

  await app.listen();
}

void bootstrap();
