import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const SIZE = 128;

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([length, typeBuf, data, checksum]);
}

function inRoundRect(x, y) {
  const left = 16;
  const top = 16;
  const right = 112;
  const bottom = 112;
  const radius = 24;
  const cx = Math.min(Math.max(x, left + radius), right - radius);
  const cy = Math.min(Math.max(y, top + radius), bottom - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function inTriangle(px, py) {
  const ax = 50;
  const ay = 40;
  const bx = 50;
  const by = 88;
  const cx = 90;
  const cy = 64;
  const v0x = cx - ax;
  const v0y = cy - ay;
  const v1x = bx - ax;
  const v1y = by - ay;
  const v2x = px - ax;
  const v2y = py - ay;
  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;
  const denom = dot00 * dot11 - dot01 * dot01;
  if (denom === 0) return false;
  const inv = 1 / denom;
  const u = (dot11 * dot02 - dot01 * dot12) * inv;
  const v = (dot00 * dot12 - dot01 * dot02) * inv;
  return u >= 0 && v >= 0 && u + v <= 1;
}

export function createIconPng() {
  const rows = [];

  for (let y = 0; y < SIZE; y += 1) {
    const row = Buffer.alloc(1 + SIZE * 4);
    row[0] = 0;

    for (let x = 0; x < SIZE; x += 1) {
      const offset = 1 + x * 4;
      if (!inRoundRect(x, y)) continue;

      const light = inTriangle(x, y);
      row[offset] = light ? 250 : 24;
      row[offset + 1] = light ? 250 : 24;
      row[offset + 2] = light ? 250 : 27;
      row[offset + 3] = 255;
    }

    rows.push(row);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  if (!png.subarray(0, signature.length).equals(signature)) {
    throw new Error('PNG signature mismatch');
  }

  return png;
}

export async function writeIcon(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, createIconPng());
}

if (process.argv[1]?.endsWith('write-icon.mjs')) {
  const packageRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
  );
  await writeIcon(path.join(packageRoot, 'assets/icon-128.png'));
}
