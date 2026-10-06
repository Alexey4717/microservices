import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { AI_ASSISTANT_GRPC_CLIENT, GRPC_LOADER_OPTIONS } from '@libs/common';
import { AI_ASSISTANT_PACKAGE, getAiAssistantProtoPath } from '@libs/proto';

import { AiAssistantGrpcService } from '../services/ai-assistant-grpc.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: AI_ASSISTANT_GRPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: AI_ASSISTANT_PACKAGE,
            protoPath: getAiAssistantProtoPath(),
            url: configService.getOrThrow<string>('AI_ASSISTANT_GRPC_URL'),
            loader: { ...GRPC_LOADER_OPTIONS },
          },
        }),
      },
    ]),
  ],
  providers: [AiAssistantGrpcService],
  exports: [AiAssistantGrpcService],
})
export class AiAssistantGrpcModule {}
