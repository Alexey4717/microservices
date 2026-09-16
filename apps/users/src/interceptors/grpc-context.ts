import { ExecutionContext } from '@nestjs/common';

import { Metadata } from '@grpc/grpc-js';

export function isGrpcMetadataContext(rpcContext: unknown): boolean {
  if (rpcContext instanceof Metadata) {
    return true;
  }
  if (typeof rpcContext !== 'object' || rpcContext === null) {
    return false;
  }
  if (
    typeof (rpcContext as { getPattern?: unknown }).getPattern === 'function'
  ) {
    return false;
  }
  if (typeof (rpcContext as Metadata).get === 'function') {
    return true;
  }
  if ((rpcContext as { metadata?: unknown }).metadata instanceof Metadata) {
    return true;
  }
  return (
    typeof (rpcContext as { getMetadata?: unknown }).getMetadata === 'function'
  );
}

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
