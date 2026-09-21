import { Controller, UseInterceptors } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { Metadata } from '@grpc/grpc-js';

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

import { InternalTokenInterceptor } from '../interceptors/internal-token.interceptor';
import { AuthService } from '../services/auth.service';

@Controller()
@UseInterceptors(InternalTokenInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @GrpcMethod(AUTH_SERVICE_NAME, 'Register')
  register(data: RegisterRequest): Promise<AuthResponse> {
    return this.authService.register(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'Login')
  login(data: LoginRequest): Promise<AuthResponse> {
    return this.authService.login(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'LoginWithTelegram')
  loginWithTelegram(data: LoginWithTelegramRequest): Promise<AuthResponse> {
    return this.authService.loginWithTelegram(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'OauthUpsert')
  oauthUpsert(data: OauthUpsertRequest): Promise<AuthResponse> {
    return this.authService.oauthUpsert(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'Refresh')
  refresh(data: RefreshRequest): Promise<AuthResponse> {
    return this.authService.refresh(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'Logout')
  logout(data: LogoutRequest): Promise<Empty> {
    return this.authService.logout(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'GetMe')
  getMe(data: GetMeRequest, metadata: Metadata): Promise<UserResponse> {
    return this.authService.getMe(data, metadata);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'UpdateMe')
  updateMe(data: UpdateMeRequest, metadata: Metadata): Promise<UserResponse> {
    return this.authService.updateMe(data, metadata);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'GetMeByTelegram')
  getMeByTelegram(data: GetMeByTelegramRequest): Promise<UserResponse> {
    return this.authService.getMeByTelegram(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'CreateTelegramLinkToken')
  createTelegramLinkToken(
    data: CreateTelegramLinkTokenRequest,
    metadata: Metadata,
  ): Promise<CreateTelegramLinkTokenResponse> {
    return this.authService.createTelegramLinkToken(data, metadata);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'ConsumeTelegramLinkToken')
  consumeTelegramLinkToken(
    data: ConsumeTelegramLinkTokenRequest,
  ): Promise<UserResponse> {
    return this.authService.consumeTelegramLinkToken(data);
  }

  @GrpcMethod(AUTH_SERVICE_NAME, 'UpsertTelegramProfile')
  upsertTelegramProfile(
    data: UpsertTelegramProfileRequest,
  ): Promise<UserResponse> {
    return this.authService.upsertTelegramProfile(data);
  }
}
