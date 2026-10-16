import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { PassportModule } from '@nestjs/passport';

import { GraphQLUpload } from 'graphql-upload-ts';
import { join } from 'node:path';

import { validateGatewayEnv } from '@libs/common';

import { AuthController } from './controllers/auth.controller';
import { UserProjectionController } from './controllers/user-projection.controller';
import { RpcExceptionFilter } from './filters/rpc-exception.filter';
import { AiAssistantGrpcModule } from './grpc/ai-assistant-grpc.module';
import { FilesGrpcModule } from './grpc/files-grpc.module';
import { PaymentsGrpcModule } from './grpc/payments-grpc.module';
import { UsersGrpcModule } from './grpc/users-grpc.module';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ComplexityPlugin } from './plugins/complexity.plugin';
import { AiAssistantResolver } from './resolvers/ai-assistant.resolver';
import { AuthResolver } from './resolvers/auth.resolver';
import { PaymentsResolver } from './resolvers/payments.resolver';
import { UsersResolver } from './resolvers/users.resolver';
import { VideosResolver } from './resolvers/videos.resolver';
import { CreateTelegramLinkUseCase } from './services/create-telegram-link.use-case';
import { GetMeUseCase } from './services/get-me.use-case';
import { LoginWithTelegramUseCase } from './services/login-with-telegram.use-case';
import { LoginUseCase } from './services/login.use-case';
import { LogoutUseCase } from './services/logout.use-case';
import { OauthUpsertUseCase } from './services/oauth-upsert.use-case';
import { PrismaService } from './services/prisma.service';
import { RefreshUseCase } from './services/refresh.use-case';
import { RegisterUseCase } from './services/register.use-case';
import { TelegramLinkedService } from './services/telegram-linked.service';
import { UpdateMeUseCase } from './services/update-me.use-case';
import { UploadAvatarUseCase } from './services/upload-avatar.use-case';
import { UserProjectionService } from './services/user-projection.service';
import { UserWriteThroughHelper } from './services/user-write-through.helper';
import { GithubStrategy } from './strategies/github.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateGatewayEnv,
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): ApolloDriverConfig => {
        const isProd = configService.get('NODE_ENV') === 'production';
        return {
          autoSchemaFile: isProd
            ? true
            : join(process.cwd(), 'libs/graphql/schema.graphql'),
          sortSchema: true,
          playground: !isProd,
          graphiql: !isProd,
          introspection: !isProd,
          path: '/graphql',
          preserveHttpStatusForExecutionErrors: false,
          includeStacktraceInErrorResponses: !isProd,
          resolvers: { Upload: GraphQLUpload },
          context: ({ req, res }: { req: unknown; res: unknown }) => ({
            req,
            res,
          }),
        };
      },
    }),
    PassportModule.register({ session: false }),
    UsersGrpcModule,
    FilesGrpcModule,
    PaymentsGrpcModule,
    AiAssistantGrpcModule,
  ],
  controllers: [AuthController, UserProjectionController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: RpcExceptionFilter,
    },
    ComplexityPlugin,
    PrismaService,
    UserProjectionService,
    TelegramLinkedService,
    UserWriteThroughHelper,
    RegisterUseCase,
    LoginUseCase,
    LoginWithTelegramUseCase,
    RefreshUseCase,
    LogoutUseCase,
    OauthUpsertUseCase,
    GetMeUseCase,
    UpdateMeUseCase,
    UploadAvatarUseCase,
    CreateTelegramLinkUseCase,
    AuthResolver,
    UsersResolver,
    PaymentsResolver,
    VideosResolver,
    AiAssistantResolver,
    JwtStrategy,
    GoogleStrategy,
    GithubStrategy,
    GoogleAuthGuard,
    GithubAuthGuard,
  ],
})
export class AppModule {}
