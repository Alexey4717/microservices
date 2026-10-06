import { ExecutionContext } from '@nestjs/common';

import { Metadata } from '@grpc/grpc-js';

export function extractGrpcMetadata(context: ExecutionContext): Metadata {
  const rpcContext: unknown = context.switchToRpc().getContext();

  if (rpcContext instanceof Metadata) {
    return rpcContext;
  }

  if (typeof rpcContext === 'object' && rpcContext !== null) {
    if (typeof (rpcContext as Metadata).get === 'function') {
      return rpcContext as Metadata;
    }

    const withMetadata = rpcContext as { metadata?: Metadata };
    if (withMetadata.metadata instanceof Metadata) {
      return withMetadata.metadata;
    }

    const call = rpcContext as { getMetadata?: () => Metadata };
    if (typeof call.getMetadata === 'function') {
      return call.getMetadata();
    }
  }

  return new Metadata();
}
