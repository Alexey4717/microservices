import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { Metadata, status } from '@grpc/grpc-js';

import { requireUserId } from '@libs/common';
import type { GetMeRequest, UserResponse } from '@libs/proto';

import {
  telegramUserInclude,
  toUserResponse,
} from '../helpers/auth-user-response';
import { PrismaService } from './prisma.service';

@Injectable()
export class GetMeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    _data: GetMeRequest,
    metadata: Metadata,
  ): Promise<UserResponse> {
    const userId = requireUserId(metadata);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: telegramUserInclude,
    });
    if (!user) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'User not found',
      });
    }

    return toUserResponse(user);
  }
}
