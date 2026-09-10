import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { Metadata } from '@grpc/grpc-js';

import { AUTH_SERVICE_NAME } from '@libs/proto';
import type {
  AuthResponse,
  Empty,
  GetMeRequest,
  LoginRequest,
  LogoutRequest,
  OauthUpsertRequest,
  RefreshRequest,
  RegisterRequest,
  UserResponse,
} from '@libs/proto';

import { AuthService } from '../services/auth.service';

@Controller()
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
}
