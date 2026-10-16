import { Injectable, Logger } from '@nestjs/common';

import { isUsersTransportError, mapRpcToGraphqlError } from '@libs/common';
import type { UserResponse } from '@libs/proto';

import { UserProjectionService } from './user-projection.service';
import { UserWriteThroughHelper } from './user-write-through.helper';
import { UsersGrpcService } from './users-grpc.service';

@Injectable()
export class GetMeUseCase {
  private readonly logger = new Logger(GetMeUseCase.name);

  constructor(
    private readonly usersGrpc: UsersGrpcService,
    private readonly userProjection: UserProjectionService,
    private readonly writeThroughHelper: UserWriteThroughHelper,
  ) {}

  async execute(userId: string): Promise<UserResponse> {
    try {
      const profile = await this.usersGrpc.getMe(
        userId,
        this.writeThroughHelper.internalToken(),
      );
      await this.writeThroughHelper.writeThrough(profile);
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
}
