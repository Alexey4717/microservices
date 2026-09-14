import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import {
  GRPC_CHANNEL_OPTIONS,
  GRPC_LOADER_OPTIONS,
  GRPC_MAX_MESSAGE_BYTES,
} from '@libs/common';
import { FILES_PACKAGE, getFilesProtoPath } from '@libs/proto';

import { FilesModule } from './files.module';

async function bootstrap() {
  const app = await NestFactory.create(FilesModule, { bufferLogs: true });
  const configService = app.get(ConfigService);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: FILES_PACKAGE,
      protoPath: getFilesProtoPath(),
      url: configService.get<string>('FILES_GRPC_URL') ?? '127.0.0.1:50052',
      loader: { ...GRPC_LOADER_OPTIONS },
      maxReceiveMessageLength: GRPC_MAX_MESSAGE_BYTES,
      maxSendMessageLength: GRPC_MAX_MESSAGE_BYTES,
      channelOptions: { ...GRPC_CHANNEL_OPTIONS },
    },
  });

  await app.startAllMicroservices();

  const port = configService.get<number>('FILES_PORT') ?? 3002;
  const host = configService.get<string>('FILES_HOST') ?? '127.0.0.1';
  await app.listen(port, host);
}

void bootstrap();
