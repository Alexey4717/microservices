import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { GRPC_LOADER_OPTIONS } from '@libs/common';
import { AI_ASSISTANT_PACKAGE, getAiAssistantProtoPath } from '@libs/proto';

import { AiAssistantModule } from './ai-assistant.module';

async function bootstrap() {
  const app = await NestFactory.create(AiAssistantModule, { bufferLogs: true });
  const configService = app.get(ConfigService);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: AI_ASSISTANT_PACKAGE,
      protoPath: getAiAssistantProtoPath(),
      url:
        configService.get<string>('AI_ASSISTANT_GRPC_URL') ?? '127.0.0.1:50054',
      loader: { ...GRPC_LOADER_OPTIONS },
    },
  });

  await app.startAllMicroservices();

  const port = configService.get<number>('AI_ASSISTANT_PORT') ?? 3005;
  const host = configService.get<string>('AI_ASSISTANT_HOST') ?? '127.0.0.1';
  await app.listen(port, host);
}

void bootstrap();
