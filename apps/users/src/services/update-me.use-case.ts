import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { Metadata, status } from '@grpc/grpc-js';

import { emptyToNull, emptyToUndefined, requireUserId } from '@libs/common';
import type { UpdateMeRequest, UserResponse } from '@libs/proto';

import { toUserResponse } from '../helpers/auth-user-response';
import { hasOptionalField } from '../helpers/auth-validation';
import { AuthSupportHelper } from './auth-support.helper';
import { PrismaService } from './prisma.service';

@Injectable()
export class UpdateMeUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authSupport: AuthSupportHelper,
  ) {}

  async execute(
    data: UpdateMeRequest,
    metadata: Metadata,
  ): Promise<UserResponse> {
    const userId = requireUserId(metadata);

    const hasName = hasOptionalField(data, 'name');
    const hasAvatarUrl = hasOptionalField(data, 'avatarUrl');
    if (!hasName && !hasAvatarUrl) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'At least one field is required',
      });
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'User not found',
      });
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(hasName ? { name: emptyToUndefined(data.name) ?? null } : {}),
        ...(hasAvatarUrl ? { avatarUrl: emptyToNull(data.avatarUrl) } : {}),
      },
    });

    this.authSupport.emitUpdated(updated);
    return toUserResponse(updated);
  }
}
