import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';

import { FILES_GRPC_CLIENT, filesGrpcClientOptions } from '@libs/common';

import { FilesGrpcService } from '../services/files-grpc.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: FILES_GRPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => filesGrpcClientOptions(config),
      },
    ]),
  ],
  providers: [FilesGrpcService],
  exports: [FilesGrpcService],
})
export class FilesGrpcModule {}
