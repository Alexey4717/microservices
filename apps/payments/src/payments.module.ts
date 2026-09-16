import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ClientsModule, Transport } from '@nestjs/microservices';

import {
  PAYMENTS_RMQ_CLIENT,
  paymentsEventsPublisherOptions,
  validatePaymentsEnv,
} from '@libs/common';

import { HealthController } from './controllers/health.controller';
import { PaymentsController } from './controllers/payments.controller';
import { WebhooksController } from './controllers/webhooks.controller';
import { InternalTokenInterceptor } from './interceptors/internal-token.interceptor';
import { PaymentsService } from './services/payments.service';
import { PrismaService } from './services/prisma.service';
import { PaypalClient } from './services/providers/paypal-client';
import { PaypalPaymentStrategy } from './services/providers/paypal.strategy';
import { PaymentProviderRegistry } from './services/providers/provider-registry';
import { StripePaymentStrategy } from './services/providers/stripe.strategy';
import { WebhookService } from './services/webhook.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validatePaymentsEnv,
    }),
    ClientsModule.registerAsync([
      {
        name: PAYMENTS_RMQ_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: paymentsEventsPublisherOptions(
            configService.getOrThrow<string>('RABBITMQ_URL'),
          ),
        }),
      },
    ]),
  ],
  controllers: [HealthController, PaymentsController, WebhooksController],
  providers: [
    PrismaService,
    PaypalClient,
    StripePaymentStrategy,
    PaypalPaymentStrategy,
    PaymentProviderRegistry,
    PaymentsService,
    WebhookService,
    {
      provide: APP_INTERCEPTOR,
      useClass: InternalTokenInterceptor,
    },
  ],
})
export class PaymentsModule {}
