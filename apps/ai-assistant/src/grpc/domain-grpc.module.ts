import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import {
  FILES_GRPC_CLIENT,
  GRPC_LOADER_OPTIONS,
  PAYMENTS_GRPC_CLIENT,
  USERS_GRPC_CLIENT,
} from '@libs/common';
import {
  AUTH_PACKAGE,
  FILES_PACKAGE,
  PAYMENTS_PACKAGE,
  getAuthProtoPath,
  getFilesProtoPath,
  getPaymentsProtoPath,
} from '@libs/proto';

import { FilesGrpcService } from '../services/files-grpc.service';
import { PaymentsGrpcService } from '../services/payments-grpc.service';
import { UsersGrpcService } from '../services/users-grpc.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: USERS_GRPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: AUTH_PACKAGE,
            protoPath: getAuthProtoPath(),
            url: configService.getOrThrow<string>('USERS_GRPC_URL'),
            loader: { ...GRPC_LOADER_OPTIONS },
          },
        }),
      },
      {
        name: PAYMENTS_GRPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: PAYMENTS_PACKAGE,
            protoPath: getPaymentsProtoPath(),
            url: configService.getOrThrow<string>('PAYMENTS_GRPC_URL'),
            loader: { ...GRPC_LOADER_OPTIONS },
          },
        }),
      },
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
          },
        }),
      },
    ]),
  ],
  providers: [UsersGrpcService, PaymentsGrpcService, FilesGrpcService],
  exports: [UsersGrpcService, PaymentsGrpcService, FilesGrpcService],
})
export class DomainGrpcModule {}
