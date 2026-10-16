import { Injectable } from '@nestjs/common';

import type { AuthResponse } from '@libs/proto';

import { UserWriteThroughHelper } from './user-write-through.helper';
import { UsersGrpcService } from './users-grpc.service';

@Injectable()
export class RefreshUseCase {
  constructor(
    private readonly usersGrpc: UsersGrpcService,
    private readonly writeThroughHelper: UserWriteThroughHelper,
  ) {}

  async execute(refreshToken: string): Promise<AuthResponse> {
    const result = await this.usersGrpc.refresh(
      { refreshToken },
      this.writeThroughHelper.internalToken(),
    );
    await this.writeThroughHelper.writeThrough(result.user);
    return result;
  }
}
