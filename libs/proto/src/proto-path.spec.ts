import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { GRPC_LOADER_OPTIONS } from '@libs/common';

import { AUTH_PACKAGE, AUTH_SERVICE_NAME } from './auth.constants';
import { getAuthProtoPath } from './proto-path';

describe('getAuthProtoPath', () => {
  it('резолвит auth.proto с rpc UpsertTelegramProfile', () => {
    const protoPath = getAuthProtoPath();
    const contents = readFileSync(protoPath, 'utf8');

    expect(contents).toMatch(/rpc\s+UpsertTelegramProfile\s*\(/);
  });

  it('proto-loader отдаёт camelCase upsertTelegramProfile', () => {
    const definition = protoLoader.loadSync(getAuthProtoPath(), {
      ...GRPC_LOADER_OPTIONS,
    });
    const pkg = grpc.loadPackageDefinition(definition) as Record<
      string,
      Record<string, { prototype: object }>
    >;
    const methods = Object.keys(
      pkg[AUTH_PACKAGE]?.[AUTH_SERVICE_NAME]?.prototype ?? {},
    );

    expect(methods).toContain('upsertTelegramProfile');
  });
});
