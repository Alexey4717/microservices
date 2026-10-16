import { Injectable } from '@nestjs/common';

import type { AuthResponse } from '@libs/proto';

import { UserWriteThroughHelper } from './user-write-through.helper';
import { UsersGrpcService } from './users-grpc.service';

@Injectable()
export class LoginWithTelegramUseCase {
  constructor(
    private readonly usersGrpc: UsersGrpcService,
    private readonly writeThroughHelper: UserWriteThroughHelper,
  ) {}

  async execute(initData: string): Promise<AuthResponse> {
    const result = await this.usersGrpc.loginWithTelegram(
      { initData },
      this.writeThroughHelper.internalToken(),
    );
    await this.writeThroughHelper.writeThrough(result.user);
    return result;
  }
}
