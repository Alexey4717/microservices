import { Metadata } from '@grpc/grpc-js';

import {
  INTERNAL_TOKEN_METADATA_KEY,
  USER_ID_METADATA_KEY,
} from './client-tokens';

export function getMetadataValue(
  metadata: Metadata | undefined,
  key: string,
): string | undefined {
  if (!metadata) {
    return undefined;
  }

  const values = metadata.get(key);
  const first = values[0];
  return first === undefined ? undefined : first.toString();
}

export function createInternalMetadata(
  internalToken: string,
  userId?: string,
): Metadata {
  const metadata = new Metadata();
  metadata.set(INTERNAL_TOKEN_METADATA_KEY, internalToken);
  if (userId) {
    metadata.set(USER_ID_METADATA_KEY, userId);
  }
  return metadata;
}
