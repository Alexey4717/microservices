import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { GRPC_LOADER_OPTIONS, PAYMENTS_GRPC_CLIENT } from '@libs/common';
import { PAYMENTS_PACKAGE, getPaymentsProtoPath } from '@libs/proto';

import { PaymentsGrpcService } from '../services/payments-grpc.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
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
    ]),
  ],
  providers: [PaymentsGrpcService],
  exports: [PaymentsGrpcService],
})
export class PaymentsGrpcModule {}
