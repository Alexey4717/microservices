import { Injectable } from '@nestjs/common';

import type { AuthResponse, OauthUpsertRequest } from '@libs/proto';

import type { OauthProfile } from '../types/auth.types';
import { UserWriteThroughHelper } from './user-write-through.helper';
import { UsersGrpcService } from './users-grpc.service';

@Injectable()
export class OauthUpsertUseCase {
  constructor(
    private readonly usersGrpc: UsersGrpcService,
    private readonly writeThroughHelper: UserWriteThroughHelper,
  ) {}

  async execute(profile: OauthProfile): Promise<AuthResponse> {
    const payload: OauthUpsertRequest = {
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    };
    const result = await this.usersGrpc.oauthUpsert(
      payload,
      this.writeThroughHelper.internalToken(),
    );
    await this.writeThroughHelper.writeThrough(result.user);
    return result;
  }
}
