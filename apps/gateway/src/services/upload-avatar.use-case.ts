import { Injectable } from '@nestjs/common';

import { GraphQLError } from 'graphql';

import { AVATAR_MAX_BYTES, isAllowedAvatarMime } from '@libs/common';
import type { UserResponse } from '@libs/proto';

import { FilesGrpcService } from './files-grpc.service';
import { UpdateMeUseCase } from './update-me.use-case';
import { UserWriteThroughHelper } from './user-write-through.helper';

@Injectable()
export class UploadAvatarUseCase {
  constructor(
    private readonly filesGrpc: FilesGrpcService,
    private readonly writeThroughHelper: UserWriteThroughHelper,
    private readonly updateMeUseCase: UpdateMeUseCase,
  ) {}

  async execute(
    userId: string,
    file: { filename: string; mimeType: string; buffer: Buffer },
  ): Promise<UserResponse> {
    if (!isAllowedAvatarMime(file.mimeType)) {
      throw new GraphQLError('Unsupported image type', {
        extensions: { code: 'BAD_REQUEST', http: { status: 400 } },
      });
    }
    if (file.buffer.length > AVATAR_MAX_BYTES) {
      throw new GraphQLError('File too large', {
        extensions: { code: 'BAD_REQUEST', http: { status: 400 } },
      });
    }

    const uploaded = await this.filesGrpc.uploadFile(
      {
        filename: file.filename,
        mimeType: file.mimeType,
        content: file.buffer,
      },
      this.writeThroughHelper.internalToken(),
      userId,
    );

    return this.updateMeUseCase.execute(userId, { avatarUrl: uploaded.url });
  }
}
