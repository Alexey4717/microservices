import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { GRPC_LOADER_OPTIONS } from '@libs/common';
import { PAYMENTS_PACKAGE, getPaymentsProtoPath } from '@libs/proto';

import { PaymentsModule } from './payments.module';

async function bootstrap() {
  const app = await NestFactory.create(PaymentsModule, {
    bufferLogs: true,
    rawBody: true,
  });
  const configService = app.get(ConfigService);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: PAYMENTS_PACKAGE,
      protoPath: getPaymentsProtoPath(),
      url: configService.get<string>('PAYMENTS_GRPC_URL') ?? '127.0.0.1:50053',
      loader: { ...GRPC_LOADER_OPTIONS },
    },
  });

  await app.startAllMicroservices();

  const port = configService.get<number>('PAYMENTS_PORT') ?? 3003;
  const host = configService.get<string>('PAYMENTS_HOST') ?? '127.0.0.1';
  await app.listen(port, host);
}

void bootstrap();
