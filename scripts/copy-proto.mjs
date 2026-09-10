import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const destDir = join(root, 'dist/libs/proto/src');
mkdirSync(destDir, { recursive: true });
copyFileSync(
  join(root, 'libs/proto/src/auth.proto'),
  join(destDir, 'auth.proto'),
);
