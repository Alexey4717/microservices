import { RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';
import { describe, expect, it } from 'vitest';

import {
  VIDEO_DESCRIPTION_MAX_LENGTH,
  VIDEO_MAX_BYTES,
  VIDEO_TITLE_MAX_LENGTH,
  assertVideoUpload,
  parseVideoSize,
  videoExtension,
} from './video-validation';

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

const valid = {
  title: 'Ролик',
  description: '',
  mimeType: 'video/mp4',
  size: 1,
};

describe('assertVideoUpload', () => {
  it('принимает mp4 и webm в пределах лимита', () => {
    expect(assertVideoUpload(valid)).toMatchObject({
      title: 'Ролик',
      description: '',
      mimeType: 'video/mp4',
      size: 1,
    });
    expect(
      assertVideoUpload({
        ...valid,
        mimeType: 'video/webm',
        size: VIDEO_MAX_BYTES,
        description: 'описание',
      }).mimeType,
    ).toBe('video/webm');
  });

  it('обрезает пробелы и приводит MIME к нижнему регистру', () => {
    expect(
      assertVideoUpload({
        title: '  Ролик  ',
        description: '  текст  ',
        mimeType: ' Video/MP4 ',
        size: 1024,
      }),
    ).toEqual({
      title: 'Ролик',
      description: 'текст',
      mimeType: 'video/mp4',
      size: 1024,
    });
  });

  it('отклоняет пустое и слишком длинное название', () => {
    expect(
      rpcError(() => assertVideoUpload({ ...valid, title: '   ' })),
    ).toEqual({
      code: status.INVALID_ARGUMENT,
      message: 'Название должно содержать от 1 до 120 символов',
    });
    expect(
      rpcError(() =>
        assertVideoUpload({
          ...valid,
          title: 'а'.repeat(VIDEO_TITLE_MAX_LENGTH + 1),
        }),
      ),
    ).toEqual({
      code: status.INVALID_ARGUMENT,
      message: 'Название должно содержать от 1 до 120 символов',
    });
    expect(() =>
      assertVideoUpload({
        ...valid,
        title: 'а'.repeat(VIDEO_TITLE_MAX_LENGTH),
      }),
    ).not.toThrow();
  });

  it('разрешает пустое описание и отклоняет длиннее 2000', () => {
    expect(assertVideoUpload({ ...valid, description: '' }).description).toBe(
      '',
    );
    expect(() =>
      assertVideoUpload({
        ...valid,
        description: 'а'.repeat(VIDEO_DESCRIPTION_MAX_LENGTH),
      }),
    ).not.toThrow();
    expect(
      rpcError(() =>
        assertVideoUpload({
          ...valid,
          description: 'а'.repeat(VIDEO_DESCRIPTION_MAX_LENGTH + 1),
        }),
      ),
    ).toEqual({
      code: status.INVALID_ARGUMENT,
      message: 'Описание не длиннее 2000 символов',
    });
  });

  it('отклоняет неподдерживаемый mime', () => {
    expect(
      rpcError(() => assertVideoUpload({ ...valid, mimeType: 'video/ogg' })),
    ).toEqual({
      code: status.INVALID_ARGUMENT,
      message: 'Неподдерживаемый тип видео',
    });
  });

  it('отклоняет пустой, дробный и слишком большой файл', () => {
    expect(VIDEO_MAX_BYTES).toBe(100 * 1024 * 1024);
    expect(rpcError(() => assertVideoUpload({ ...valid, size: 0 }))).toEqual({
      code: status.INVALID_ARGUMENT,
      message: 'Файл пустой',
    });
    expect(rpcError(() => assertVideoUpload({ ...valid, size: 1.5 }))).toEqual({
      code: status.INVALID_ARGUMENT,
      message: 'Некорректный размер',
    });
    expect(
      rpcError(() => assertVideoUpload({ ...valid, size: Number.NaN })),
    ).toEqual({
      code: status.INVALID_ARGUMENT,
      message: 'Некорректный размер',
    });
    expect(
      rpcError(() =>
        assertVideoUpload({ ...valid, size: VIDEO_MAX_BYTES + 1 }),
      ),
    ).toEqual({
      code: status.INVALID_ARGUMENT,
      message: 'Файл слишком большой',
    });
  });
});

describe('parseVideoSize', () => {
  it('принимает число и десятичную строку', () => {
    expect(parseVideoSize(1024)).toBe(1024);
    expect(parseVideoSize('104857600')).toBe(104857600);
  });

  it('отклоняет пустое и нечисловое значение', () => {
    expect(parseVideoSize('')).toBeNaN();
    expect(parseVideoSize('abc')).toBeNaN();
    expect(parseVideoSize(undefined)).toBeNaN();
  });
});

describe('videoExtension', () => {
  it('сопоставляет MIME и расширение', () => {
    expect(videoExtension('video/mp4')).toBe('mp4');
    expect(videoExtension('video/webm')).toBe('webm');
  });
});
