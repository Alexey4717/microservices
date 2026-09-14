import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import {
  FILES_GRPC_CLIENT,
  GRPC_CHANNEL_OPTIONS,
  GRPC_LOADER_OPTIONS,
  GRPC_MAX_MESSAGE_BYTES,
} from '@libs/common';
import { FILES_PACKAGE, getFilesProtoPath } from '@libs/proto';

import { FilesGrpcService } from '../services/files-grpc.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: FILES_GRPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: FILES_PACKAGE,
            protoPath: getFilesProtoPath(),
            url: configService.getOrThrow<string>('FILES_GRPC_URL'),
            loader: { ...GRPC_LOADER_OPTIONS },
            maxReceiveMessageLength: GRPC_MAX_MESSAGE_BYTES,
            maxSendMessageLength: GRPC_MAX_MESSAGE_BYTES,
            channelOptions: { ...GRPC_CHANNEL_OPTIONS },
          },
        }),
      },
    ]),
  ],
  providers: [FilesGrpcService],
  exports: [FilesGrpcService],
})
export class FilesGrpcModule {}
