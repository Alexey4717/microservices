import { Injectable } from '@nestjs/common';

import type { UpdateMeRequest, UserResponse } from '@libs/proto';

import { UserWriteThroughHelper } from './user-write-through.helper';
import { UsersGrpcService } from './users-grpc.service';

@Injectable()
export class UpdateMeUseCase {
  constructor(
    private readonly usersGrpc: UsersGrpcService,
    private readonly writeThroughHelper: UserWriteThroughHelper,
  ) {}

  async execute(userId: string, input: UpdateMeRequest): Promise<UserResponse> {
    const payload: UpdateMeRequest = {};
    if (input.name !== undefined) {
      payload.name = input.name;
    }
    if (input.avatarUrl !== undefined) {
      payload.avatarUrl = input.avatarUrl;
    }

    const profile = await this.usersGrpc.updateMe(
      payload,
      this.writeThroughHelper.internalToken(),
      userId,
    );
    await this.writeThroughHelper.writeThrough(profile);
    return profile;
  }
}
