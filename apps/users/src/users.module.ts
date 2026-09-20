import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';

import {
  USERS_RMQ_CLIENT,
  usersEventsPublisherOptions,
  validateUsersEnv,
} from '@libs/common';

import { AuthController } from './controllers/auth.controller';
import { PaymentsEventsController } from './controllers/payments-events.controller';
import { InternalTokenInterceptor } from './interceptors/internal-token.interceptor';
import { AuthService } from './services/auth.service';
import { PaymentsEventsService } from './services/payments-events.service';
import { PrismaService } from './services/prisma.service';
import { TelegramLinkTokenCleanupService } from './services/telegram-link-token-cleanup.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateUsersEnv,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<string>(
            'JWT_ACCESS_TTL',
          ) as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
    ClientsModule.registerAsync([
      {
        name: USERS_RMQ_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: usersEventsPublisherOptions(
            configService.getOrThrow<string>('RABBITMQ_URL'),
          ),
        }),
      },
    ]),
  ],
  controllers: [AuthController, PaymentsEventsController],
  providers: [
    PrismaService,
    AuthService,
    PaymentsEventsService,
    TelegramLinkTokenCleanupService,
    InternalTokenInterceptor,
  ],
})
export class UsersModule {}
