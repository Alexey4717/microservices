import { RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';

import { AVATAR_MAX_BYTES, isAllowedAvatarMime } from '@libs/common';

export function toContentBuffer(content: unknown): Buffer {
  if (Buffer.isBuffer(content)) {
    return content;
  }
  if (content instanceof Uint8Array) {
    return Buffer.from(content);
  }
  throw new RpcException({
    code: status.INVALID_ARGUMENT,
    message: 'Invalid file content',
  });
}

export function assertAvatarUpload(mimeType: string, size: number): void {
  if (!isAllowedAvatarMime(mimeType)) {
    throw new RpcException({
      code: status.INVALID_ARGUMENT,
      message: 'Unsupported image type',
    });
  }
  if (size <= 0) {
    throw new RpcException({
      code: status.INVALID_ARGUMENT,
      message: 'File is empty',
    });
  }
  if (size > AVATAR_MAX_BYTES) {
    throw new RpcException({
      code: status.INVALID_ARGUMENT,
      message: 'File too large',
    });
  }
}
