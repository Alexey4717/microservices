import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { AUTH_PROTO_FILE } from './auth.constants';
import { FILES_PROTO_FILE } from './files.constants';
import { PAYMENTS_PROTO_FILE } from './payments.constants';

function resolveProtoPath(filename: string): string {
  const here = __dirname;
  const candidates = [
    // Source of truth first: `nest start --watch` does not recopy *.proto into dist,
    // so a stale dist file would hide newly added RPCs from ClientGrpc.getService.
    join(process.cwd(), 'libs/proto/src', filename),
    join(here, filename),
    join(process.cwd(), 'dist/libs/proto/src', filename),
    join(process.cwd(), 'dist/libs/proto', filename),
  ];

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      `Не найден ${filename}. Проверенные пути: ${candidates.join(', ')}`,
    );
  }

  return found;
}

export function getAuthProtoPath(): string {
  return resolveProtoPath(AUTH_PROTO_FILE);
}

export function getFilesProtoPath(): string {
  return resolveProtoPath(FILES_PROTO_FILE);
}

export function getPaymentsProtoPath(): string {
  return resolveProtoPath(PAYMENTS_PROTO_FILE);
}
