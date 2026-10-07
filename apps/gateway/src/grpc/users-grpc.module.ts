import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';

import { USERS_GRPC_CLIENT, usersGrpcClientOptions } from '@libs/common';

import { UsersGrpcService } from '../services/users-grpc.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: USERS_GRPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => usersGrpcClientOptions(config),
      },
    ]),
  ],
  providers: [UsersGrpcService],
  exports: [UsersGrpcService],
})
export class UsersGrpcModule {}
