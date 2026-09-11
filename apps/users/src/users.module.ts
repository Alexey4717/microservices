import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';

import {
  USERS_RMQ_CLIENT,
  usersEventsPublisherOptions,
  validateUsersEnv,
} from '@libs/common';

import { AuthController } from './controllers/auth.controller';
import { InternalTokenInterceptor } from './interceptors/internal-token.interceptor';
import { AuthService } from './services/auth.service';
import { PrismaService } from './services/prisma.service';

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
  controllers: [AuthController],
  providers: [
    PrismaService,
    AuthService,
    {
      provide: APP_INTERCEPTOR,
      useClass: InternalTokenInterceptor,
    },
  ],
})
export class UsersModule {}
