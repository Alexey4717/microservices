import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';

import {
  InternalTokenInterceptor,
  USERS_RMQ_CLIENT,
  usersEventsPublisherOptions,
  validateUsersEnv,
} from '@libs/common';

import { AuthController } from './controllers/auth.controller';
import { PaymentsEventsController } from './controllers/payments-events.controller';
import { AuthSupportHelper } from './services/auth-support.helper';
import { ConsumeTelegramLinkTokenUseCase } from './services/consume-telegram-link-token.use-case';
import { CreateTelegramLinkTokenUseCase } from './services/create-telegram-link-token.use-case';
import { GetMeByTelegramUseCase } from './services/get-me-by-telegram.use-case';
import { GetMeUseCase } from './services/get-me.use-case';
import { LoginUserUseCase } from './services/login-user.use-case';
import { LoginWithTelegramUseCase } from './services/login-with-telegram.use-case';
import { LogoutUserUseCase } from './services/logout-user.use-case';
import { OauthUpsertUseCase } from './services/oauth-upsert.use-case';
import { PaymentsEventsService } from './services/payments-events.service';
import { PrismaService } from './services/prisma.service';
import { RefreshTokensUseCase } from './services/refresh-tokens.use-case';
import { RegisterUserUseCase } from './services/register-user.use-case';
import { TelegramLinkTokenCleanupService } from './services/telegram-link-token-cleanup.service';
import { UpdateMeUseCase } from './services/update-me.use-case';
import { UpsertTelegramProfileUseCase } from './services/upsert-telegram-profile.use-case';

const authUseCases = [
  AuthSupportHelper,
  RegisterUserUseCase,
  LoginUserUseCase,
  LoginWithTelegramUseCase,
  OauthUpsertUseCase,
  RefreshTokensUseCase,
  LogoutUserUseCase,
  GetMeUseCase,
  UpdateMeUseCase,
  GetMeByTelegramUseCase,
  CreateTelegramLinkTokenUseCase,
  ConsumeTelegramLinkTokenUseCase,
  UpsertTelegramProfileUseCase,
];

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
    ...authUseCases,
    PaymentsEventsService,
    TelegramLinkTokenCleanupService,
    InternalTokenInterceptor,
  ],
})
export class UsersModule {}
