import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const prettierBin = require.resolve('prettier/bin/prettier.cjs');
const files = process.argv
  .slice(2)
  .map((file) => file.replace(/\\:/g, ':').replace(/\\/g, '/'));

const result = spawnSync(process.execPath, [prettierBin, '--write', ...files], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
