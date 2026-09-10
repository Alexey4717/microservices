import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = process.argv[2];

if (!app || !/^[a-z0-9-]+$/i.test(app)) {
  console.error('Usage: node scripts/clean-dist.mjs <app>');
  process.exit(1);
}

const targets = [join(root, 'dist', 'apps', app), join(root, 'dist', 'libs')];

for (const target of targets) {
  rmSync(target, { recursive: true, force: true });
}
