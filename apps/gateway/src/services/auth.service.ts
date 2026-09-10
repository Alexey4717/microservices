import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type {
  AuthResponse,
  LoginRequest,
  OauthUpsertRequest,
  RegisterRequest,
  UserResponse,
} from '@libs/proto';

import type { OauthProfile } from '../types/auth.types';
import { UsersGrpcService } from './users-grpc.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersGrpc: UsersGrpcService,
    private readonly configService: ConfigService,
  ) {}

  register(input: RegisterRequest): Promise<AuthResponse> {
    return this.usersGrpc.register(input, this.internalToken());
  }

  login(input: LoginRequest): Promise<AuthResponse> {
    return this.usersGrpc.login(input, this.internalToken());
  }

  refresh(refreshToken: string): Promise<AuthResponse> {
    return this.usersGrpc.refresh({ refreshToken }, this.internalToken());
  }

  async logout(refreshToken: string): Promise<boolean> {
    await this.usersGrpc.logout({ refreshToken }, this.internalToken());
    return true;
  }

  oauthUpsert(profile: OauthProfile): Promise<AuthResponse> {
    const payload: OauthUpsertRequest = {
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    };
    return this.usersGrpc.oauthUpsert(payload, this.internalToken());
  }

  me(userId: string): Promise<UserResponse> {
    return this.usersGrpc.getMe(userId, this.internalToken());
  }

  private internalToken(): string {
    return this.configService.getOrThrow<string>('INTERNAL_SERVICE_TOKEN');
  }
}
