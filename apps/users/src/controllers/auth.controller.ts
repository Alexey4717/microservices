import { Controller, UseInterceptors } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { Metadata } from '@grpc/grpc-js';

import { InternalTokenInterceptor } from '@libs/common';
import { AUTH_SERVICE_NAME } from '@libs/proto';
import type {
  AuthResponse,
  ConsumeTelegramLinkTokenRequest,
  CreateTelegramLinkTokenRequest,
  CreateTelegramLinkTokenResponse,
  Empty,
  GetMeByTelegramRequest,
  GetMeRequest,
  LoginRequest,
  LoginWithTelegramRequest,
  LogoutRequest,
  OauthUpsertRequest,
  RefreshRequest,
  RegisterRequest,
  UpdateMeRequest,
  UpsertTelegramProfileRequest,
  UserResponse,
} from '@libs/proto';

import { ConsumeTelegramLinkTokenUseCase } from '../services/consume-telegram-link-token.use-case';
import { CreateTelegramLinkTokenUseCase } from '../services/create-telegram-link-token.use-case';
import { GetMeByTelegramUseCase } from '../services/get-me-by-telegram.use-case';
import { GetMeUseCase } from '../services/get-me.use-case';
import { LoginUserUseCase } from '../services/login-user.use-case';
import { LoginWithTelegramUseCase } from '../services/login-with-telegram.use-case';
import { LogoutUserUseCase } from '../services/logout-user.use-case';
import { OauthUpsertUseCase } from '../services/oauth-upsert.use-case';
import { RefreshTokensUseCase } from '../services/refresh-tokens.use-case';
import { RegisterUserUseCase } from '../services/register-user.use-case';
import { UpdateMeUseCase } from '../services/update-me.use-case';
import { UpsertTelegramProfileUseCase } from '../services/upsert-telegram-profile.use-case';

@Controller()
@UseInterceptors(InternalTokenInterceptor)
export class AuthController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly loginWithTelegramUseCase: LoginWithTelegramUseCase,
    private readonly oauthUpsertUseCase: OauthUpsertUseCase,
    private readonly refreshTokensUseCase: RefreshTokensUseCase,
    private readonly logoutUserUseCase: LogoutUserUseCase,
    private readonly getMeUseCase: GetMeUseCase,
    private readonly updateMeUseCase: UpdateMeUseCase,
    private readonly getMeByTelegramUseCase: GetMeByTelegramUseCase,
    private readonly createTelegramLinkTokenUseCase: CreateTelegramLinkTokenUseCase,
    private readonly consumeTelegramLinkTokenUseCase: ConsumeTelegramLinkTokenUseCase,
    private readonly upsertTelegramProfileUseCase: UpsertTelegramProfileUseCase,
  ) {}

  @GrpcMethod(AUTH_SERVICE_NAME, 'Register')
  register(data: RegisterRequest): Promise<AuthResponse> {
    return this.registerUserUseCase.execute(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'Login')
  login(data: LoginRequest): Promise<AuthResponse> {
    return this.loginUserUseCase.execute(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'LoginWithTelegram')
  loginWithTelegram(data: LoginWithTelegramRequest): Promise<AuthResponse> {
    return this.loginWithTelegramUseCase.execute(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'OauthUpsert')
  oauthUpsert(data: OauthUpsertRequest): Promise<AuthResponse> {
    return this.oauthUpsertUseCase.execute(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'Refresh')
  refresh(data: RefreshRequest): Promise<AuthResponse> {
    return this.refreshTokensUseCase.execute(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'Logout')
  logout(data: LogoutRequest): Promise<Empty> {
    return this.logoutUserUseCase.execute(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'GetMe')
  getMe(data: GetMeRequest, metadata: Metadata): Promise<UserResponse> {
    return this.getMeUseCase.execute(data, metadata);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'UpdateMe')
  updateMe(data: UpdateMeRequest, metadata: Metadata): Promise<UserResponse> {
    return this.updateMeUseCase.execute(data, metadata);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'GetMeByTelegram')
  getMeByTelegram(data: GetMeByTelegramRequest): Promise<UserResponse> {
    return this.getMeByTelegramUseCase.execute(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'CreateTelegramLinkToken')
  createTelegramLinkToken(
    data: CreateTelegramLinkTokenRequest,
    metadata: Metadata,
  ): Promise<CreateTelegramLinkTokenResponse> {
    return this.createTelegramLinkTokenUseCase.execute(data, metadata);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'ConsumeTelegramLinkToken')
  consumeTelegramLinkToken(
    data: ConsumeTelegramLinkTokenRequest,
  ): Promise<UserResponse> {
    return this.consumeTelegramLinkTokenUseCase.execute(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'UpsertTelegramProfile')
  upsertTelegramProfile(
    data: UpsertTelegramProfileRequest,
  ): Promise<UserResponse> {
    return this.upsertTelegramProfileUseCase.execute(data);
  }
}
