import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { PassportModule } from '@nestjs/passport';

import { GraphQLUpload } from 'graphql-upload-ts';

import { validateGatewayEnv } from '@libs/common';

import { AuthController } from './controllers/auth.controller';
import { UserProjectionController } from './controllers/user-projection.controller';
import { RpcExceptionFilter } from './filters/rpc-exception.filter';
import { FilesGrpcModule } from './grpc/files-grpc.module';
import { UsersGrpcModule } from './grpc/users-grpc.module';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { AuthResolver } from './resolvers/auth.resolver';
import { UsersResolver } from './resolvers/users.resolver';
import { AuthService } from './services/auth.service';
import { PrismaService } from './services/prisma.service';
import { UserProjectionService } from './services/user-projection.service';
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
          autoSchemaFile: true,
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
  ],
  controllers: [AuthController, UserProjectionController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: RpcExceptionFilter,
    },
    PrismaService,
    UserProjectionService,
    AuthService,
    AuthResolver,
    UsersResolver,
    JwtStrategy,
    GoogleStrategy,
    GithubStrategy,
    GoogleAuthGuard,
    GithubAuthGuard,
  ],
})
export class AppModule {}
