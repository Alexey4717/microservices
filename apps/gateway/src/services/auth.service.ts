import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { isUsersTransportError, mapRpcToGraphqlError } from '@libs/common';
import type {
  AuthResponse,
  LoginRequest,
  OauthUpsertRequest,
  RegisterRequest,
  UserResponse,
} from '@libs/proto';

import type { OauthProfile } from '../types/auth.types';
import { UserProjectionService } from './user-projection.service';
import { UsersGrpcService } from './users-grpc.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersGrpc: UsersGrpcService,
    private readonly userProjection: UserProjectionService,
    private readonly configService: ConfigService,
  ) {}

  async register(input: RegisterRequest): Promise<AuthResponse> {
    const result = await this.usersGrpc.register(input, this.internalToken());
    await this.writeThrough(result.user);
    return result;
  }

  async login(input: LoginRequest): Promise<AuthResponse> {
    const result = await this.usersGrpc.login(input, this.internalToken());
    await this.writeThrough(result.user);
    return result;
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const result = await this.usersGrpc.refresh(
      { refreshToken },
      this.internalToken(),
    );
    await this.writeThrough(result.user);
    return result;
  }

  async logout(refreshToken: string): Promise<boolean> {
    await this.usersGrpc.logout({ refreshToken }, this.internalToken());
    return true;
  }

  async oauthUpsert(profile: OauthProfile): Promise<AuthResponse> {
    const payload: OauthUpsertRequest = {
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    };
    const result = await this.usersGrpc.oauthUpsert(
      payload,
      this.internalToken(),
    );
    await this.writeThrough(result.user);
    return result;
  }

  async me(userId: string): Promise<UserResponse> {
    try {
      const profile = await this.usersGrpc.getMe(userId, this.internalToken());
      await this.writeThrough(profile);
      return profile;
    } catch (error) {
      if (!isUsersTransportError(error)) {
        throw error;
      }

      const projected = await this.userProjection.findById(userId);
      if (projected) {
        this.logger.warn(`users недоступен, отдаю проекцию профиля ${userId}`);
        return projected;
      }

      throw mapRpcToGraphqlError(error);
    }
  }

  private async writeThrough(user: UserResponse | undefined): Promise<void> {
    if (!user?.id || !user.email) {
      return;
    }

    try {
      await this.userProjection.upsertFromProfile(user);
    } catch (error) {
      this.logger.warn(
        `Не удалось обновить проекцию пользователя ${user.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private internalToken(): string {
    return this.configService.getOrThrow<string>('INTERNAL_SERVICE_TOKEN');
  }
}
