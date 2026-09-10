import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { AUTH_PROTO_FILE } from './auth.constants';

export function getAuthProtoPath(): string {
  const here = __dirname;
  const candidates = [
    join(here, AUTH_PROTO_FILE),
    join(process.cwd(), 'libs/proto/src', AUTH_PROTO_FILE),
    join(process.cwd(), 'dist/libs/proto/src', AUTH_PROTO_FILE),
    join(process.cwd(), 'dist/libs/proto', AUTH_PROTO_FILE),
  ];

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      `Не найден ${AUTH_PROTO_FILE}. Проверенные пути: ${candidates.join(', ')}`,
    );
  }

  return found;
}
