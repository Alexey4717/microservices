import { Injectable } from '@nestjs/common';

import { UserWriteThroughHelper } from './user-write-through.helper';
import { UsersGrpcService } from './users-grpc.service';

@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly usersGrpc: UsersGrpcService,
    private readonly writeThroughHelper: UserWriteThroughHelper,
  ) {}

  async execute(refreshToken: string): Promise<boolean> {
    await this.usersGrpc.logout(
      { refreshToken },
      this.writeThroughHelper.internalToken(),
    );
    return true;
  }
}
