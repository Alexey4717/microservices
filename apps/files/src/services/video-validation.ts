import { RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';

export const VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const VIDEO_TITLE_MAX_LENGTH = 120;
export const VIDEO_DESCRIPTION_MAX_LENGTH = 2000;

const VIDEO_EXTENSIONS = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
} as const;

export type VideoMimeType = keyof typeof VIDEO_EXTENSIONS;

export type NormalizedVideoUpload = {
  title: string;
  description: string;
  mimeType: VideoMimeType;
  size: number;
};

export function parseVideoSize(size: unknown): number {
  if (typeof size === 'number') {
    return size;
  }
  if (typeof size === 'string' && size.trim() !== '') {
    return Number(size);
  }
  return Number.NaN;
}

export function videoExtension(mimeType: VideoMimeType): string {
  return VIDEO_EXTENSIONS[mimeType];
}

export function assertVideoUpload(input: {
  title: string;
  description: string;
  mimeType: string;
  size: number;
}): NormalizedVideoUpload {
  const title = input.title.trim();
  if (title.length < 1 || title.length > VIDEO_TITLE_MAX_LENGTH) {
    throw invalid('Название должно содержать от 1 до 120 символов');
  }

  const description = input.description.trim();
  if (description.length > VIDEO_DESCRIPTION_MAX_LENGTH) {
    throw invalid('Описание не длиннее 2000 символов');
  }

  const mimeType = input.mimeType.trim().toLowerCase();
  if (!isVideoMime(mimeType)) {
    throw invalid('Неподдерживаемый тип видео');
  }

  if (input.size === 0) {
    throw invalid('Файл пустой');
  }
  if (!Number.isSafeInteger(input.size) || input.size < 1) {
    throw invalid('Некорректный размер');
  }
  if (input.size > VIDEO_MAX_BYTES) {
    throw invalid('Файл слишком большой');
  }

  return {
    title,
    description,
    mimeType,
    size: input.size,
  };
}

function isVideoMime(mimeType: string): mimeType is VideoMimeType {
  return Object.prototype.hasOwnProperty.call(VIDEO_EXTENSIONS, mimeType);
}

function invalid(message: string): RpcException {
  return new RpcException({
    code: status.INVALID_ARGUMENT,
    message,
  });
}
