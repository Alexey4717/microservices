import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GraphQLError } from 'graphql';

import {
  AVATAR_MAX_BYTES,
  isAllowedAvatarMime,
  isUsersTransportError,
  mapRpcToGraphqlError,
} from '@libs/common';
import type {
  AuthResponse,
  LoginRequest,
  OauthUpsertRequest,
  RegisterRequest,
  UpdateMeRequest,
  UserResponse,
} from '@libs/proto';

import type { OauthProfile } from '../types/auth.types';
import { FilesGrpcService } from './files-grpc.service';
import { UserProjectionService } from './user-projection.service';
import { UsersGrpcService } from './users-grpc.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersGrpc: UsersGrpcService,
    private readonly filesGrpc: FilesGrpcService,
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

  async loginWithTelegram(initData: string): Promise<AuthResponse> {
    const result = await this.usersGrpc.loginWithTelegram(
      { initData },
      this.internalToken(),
    );
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

  async updateMe(
    userId: string,
    input: UpdateMeRequest,
  ): Promise<UserResponse> {
    const payload: UpdateMeRequest = {};
    if (input.name !== undefined) {
      payload.name = input.name;
    }
    if (input.avatarUrl !== undefined) {
      payload.avatarUrl = input.avatarUrl;
    }

    const profile = await this.usersGrpc.updateMe(
      payload,
      this.internalToken(),
      userId,
    );
    await this.writeThrough(profile);
    return profile;
  }

  async uploadAvatar(
    userId: string,
    file: { filename: string; mimeType: string; buffer: Buffer },
  ): Promise<UserResponse> {
    if (!isAllowedAvatarMime(file.mimeType)) {
      throw new GraphQLError('Unsupported image type', {
        extensions: { code: 'BAD_REQUEST', http: { status: 400 } },
      });
    }
    if (file.buffer.length > AVATAR_MAX_BYTES) {
      throw new GraphQLError('File too large', {
        extensions: { code: 'BAD_REQUEST', http: { status: 400 } },
      });
    }

    const uploaded = await this.filesGrpc.uploadFile(
      {
        filename: file.filename,
        mimeType: file.mimeType,
        content: file.buffer,
      },
      this.internalToken(),
      userId,
    );

    return this.updateMe(userId, { avatarUrl: uploaded.url });
  }

  async createTelegramLink(userId: string): Promise<{ url: string }> {
    const username = (
      this.configService.get<string>('TELEGRAM_BOT_USERNAME') ?? ''
    )
      .trim()
      .replace(/^@/, '');
    if (!username) {
      throw new GraphQLError('TELEGRAM_BOT_USERNAME не задан', {
        extensions: {
          code: 'FAILED_PRECONDITION',
          http: { status: 500 },
        },
      });
    }

    const issued = await this.usersGrpc.createTelegramLinkToken(
      this.internalToken(),
      userId,
    );
    return { url: `https://t.me/${username}?start=link_${issued.token}` };
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
