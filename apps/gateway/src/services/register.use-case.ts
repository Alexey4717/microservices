import { Injectable } from '@nestjs/common';

import type { AuthResponse, RegisterRequest } from '@libs/proto';

import { UserWriteThroughHelper } from './user-write-through.helper';
import { UsersGrpcService } from './users-grpc.service';

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly usersGrpc: UsersGrpcService,
    private readonly writeThroughHelper: UserWriteThroughHelper,
  ) {}

  async execute(input: RegisterRequest): Promise<AuthResponse> {
    const result = await this.usersGrpc.register(
      input,
      this.writeThroughHelper.internalToken(),
    );
    await this.writeThroughHelper.writeThrough(result.user);
    return result;
  }
}
