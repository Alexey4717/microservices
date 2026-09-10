import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { GRPC_LOADER_OPTIONS, USERS_GRPC_CLIENT } from '@libs/common';
import { AUTH_PACKAGE, getAuthProtoPath } from '@libs/proto';

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
    ]),
  ],
  providers: [UsersGrpcService],
  exports: [UsersGrpcService],
})
export class UsersGrpcModule {}
