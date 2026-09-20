import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'libs/proto/src');
const destDirs = [
  join(root, 'dist/libs/proto/src'),
  join(root, 'dist/libs/proto'),
];

for (const destDir of destDirs) {
  mkdirSync(destDir, { recursive: true });
  for (const file of readdirSync(srcDir)) {
    if (file.endsWith('.proto')) {
      copyFileSync(join(srcDir, file), join(destDir, file));
    }
  }
}
