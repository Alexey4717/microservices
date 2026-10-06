import { RpcException } from '@nestjs/microservices';

import { Metadata, status } from '@grpc/grpc-js';

import { USER_ID_METADATA_KEY, getMetadataValue } from '@libs/common';

export function requireUserId(metadata: Metadata): string {
  const userId = getMetadataValue(metadata, USER_ID_METADATA_KEY);
  if (!userId) {
    throw new RpcException({
      code: status.UNAUTHENTICATED,
      message: 'Missing user-id metadata',
    });
  }
  return userId;
}
