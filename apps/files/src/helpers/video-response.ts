import { RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';

import type { VideoResponse } from '@libs/proto';

export type VideoRecord = {
  id: string;
  ownerUserId: string;
  title: string;
  description: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  status: 'PENDING' | 'READY';
  objectKey: string;
};

export function toVideoResponse(video: VideoRecord): VideoResponse {
  return {
    id: video.id,
    ownerUserId: video.ownerUserId,
    title: video.title,
    description: video.description,
    url: video.url,
    mimeType: video.mimeType,
    size: video.size,
    createdAt: video.createdAt.toISOString(),
  };
}

export function notFound(): RpcException {
  return new RpcException({
    code: status.NOT_FOUND,
    message: 'Видео не найдено',
  });
}

export function invalid(message: string): RpcException {
  return new RpcException({
    code: status.INVALID_ARGUMENT,
    message,
  });
}

export function internal(message: string): RpcException {
  return new RpcException({
    code: status.INTERNAL,
    message,
  });
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
