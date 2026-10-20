import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as esbuild from 'esbuild';

import { writeIcon } from './write-icon.mjs';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const dist = path.join(packageRoot, 'dist');

await rm(dist, { recursive: true, force: true });

const shared = {
  bundle: true,
  target: 'chrome120',
  sourcemap: false,
  legalComments: 'none',
};

await esbuild.build({
  ...shared,
  entryPoints: [path.join(packageRoot, 'src/background/service-worker.ts')],
  format: 'esm',
  outfile: path.join(dist, 'service-worker.js'),
});

await esbuild.build({
  ...shared,
  entryPoints: [path.join(packageRoot, 'src/content/catalog.ts')],
  format: 'iife',
  outfile: path.join(dist, 'content/catalog.js'),
});

await esbuild.build({
  ...shared,
  entryPoints: [path.join(packageRoot, 'src/popup/popup.ts')],
  format: 'iife',
  outfile: path.join(dist, 'popup/popup.js'),
});

await esbuild.build({
  ...shared,
  entryPoints: [path.join(packageRoot, 'src/sidepanel/sidepanel.ts')],
  format: 'iife',
  outfile: path.join(dist, 'sidepanel/sidepanel.js'),
});

await mkdir(path.join(dist, 'popup'), { recursive: true });
await mkdir(path.join(dist, 'sidepanel'), { recursive: true });
await mkdir(path.join(dist, 'content'), { recursive: true });
await mkdir(path.join(dist, 'icons'), { recursive: true });

await copyFile(
  path.join(packageRoot, 'src/manifest.json'),
  path.join(dist, 'manifest.json'),
);
await copyFile(
  path.join(packageRoot, 'src/popup/popup.html'),
  path.join(dist, 'popup/popup.html'),
);
await copyFile(
  path.join(packageRoot, 'src/popup/popup.css'),
  path.join(dist, 'popup/popup.css'),
);
await copyFile(
  path.join(packageRoot, 'src/sidepanel/sidepanel.html'),
  path.join(dist, 'sidepanel/sidepanel.html'),
);
await copyFile(
  path.join(packageRoot, 'src/sidepanel/sidepanel.css'),
  path.join(dist, 'sidepanel/sidepanel.css'),
);
await copyFile(
  path.join(packageRoot, 'src/content/catalog.css'),
  path.join(dist, 'content/catalog.css'),
);

const iconPath = path.join(packageRoot, 'assets/icon-128.png');
await writeIcon(iconPath);
await copyFile(iconPath, path.join(dist, 'icons/icon-128.png'));
