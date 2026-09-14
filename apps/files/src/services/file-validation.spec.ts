import { RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';
import { describe, expect, it } from 'vitest';

import { AVATAR_MAX_BYTES } from '@libs/common';

import { assertAvatarUpload, toContentBuffer } from './file-validation';

function rpcError(fn: () => void): { code: number; message: string } {
  try {
    fn();
    throw new Error('expected RpcException');
  } catch (error) {
    if (error instanceof RpcException) {
      return error.getError() as { code: number; message: string };
    }
    throw error;
  }
}

describe('assertAvatarUpload', () => {
  it('принимает jpeg в пределах 2MB', () => {
    expect(() => assertAvatarUpload('image/jpeg', 1024)).not.toThrow();
  });

  it('отклоняет неподдерживаемый mime', () => {
    expect(rpcError(() => assertAvatarUpload('application/pdf', 100))).toEqual({
      code: status.INVALID_ARGUMENT,
      message: 'Unsupported image type',
    });
  });

  it('отклоняет пустой файл', () => {
    expect(rpcError(() => assertAvatarUpload('image/png', 0))).toEqual({
      code: status.INVALID_ARGUMENT,
      message: 'File is empty',
    });
  });

  it('отклоняет файл больше 2MB', () => {
    expect(AVATAR_MAX_BYTES).toBe(2 * 1024 * 1024);
    expect(
      rpcError(() => assertAvatarUpload('image/webp', 3 * 1024 * 1024)),
    ).toEqual({
      code: status.INVALID_ARGUMENT,
      message: 'File too large',
    });
  });
});

describe('toContentBuffer', () => {
  it('принимает Buffer и Uint8Array', () => {
    expect(toContentBuffer(Buffer.from('abc')).toString()).toBe('abc');
    expect(
      toContentBuffer(Uint8Array.from([1, 2])).equals(Buffer.from([1, 2])),
    ).toBe(true);
  });

  it('отклоняет невалидный контент', () => {
    expect(rpcError(() => toContentBuffer('not-bytes'))).toEqual({
      code: status.INVALID_ARGUMENT,
      message: 'Invalid file content',
    });
  });
});
