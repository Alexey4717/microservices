import { Injectable } from '@nestjs/common';

import type { AuthResponse, LoginRequest } from '@libs/proto';

import { UserWriteThroughHelper } from './user-write-through.helper';
import { UsersGrpcService } from './users-grpc.service';

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly usersGrpc: UsersGrpcService,
    private readonly writeThroughHelper: UserWriteThroughHelper,
  ) {}

  async execute(input: LoginRequest): Promise<AuthResponse> {
    const result = await this.usersGrpc.login(
      input,
      this.writeThroughHelper.internalToken(),
    );
    await this.writeThroughHelper.writeThrough(result.user);
    return result;
  }
}
