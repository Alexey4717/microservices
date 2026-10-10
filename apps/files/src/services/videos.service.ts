import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { Metadata, status } from '@grpc/grpc-js';
import { randomUUID } from 'node:crypto';

import { requireUserId } from '@libs/common';
import type {
  CompleteVideoUploadRequest,
  CreateVideoUploadRequest,
  CreateVideoUploadResponse,
  GetVideoRequest,
  ListVideosResponse,
  VideoResponse,
} from '@libs/proto';

import { PrismaService } from './prisma.service';
import { StorageService } from './storage.service';
import {
  assertVideoUpload,
  parseVideoSize,
  videoExtension,
} from './video-validation';

type VideoRecord = {
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

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async createVideoUpload(
    data: CreateVideoUploadRequest,
    metadata: Metadata,
  ): Promise<CreateVideoUploadResponse> {
    const ownerUserId = requireUserId(metadata);
    const video = assertVideoUpload({
      title: data.title ?? '',
      description: data.description ?? '',
      mimeType: data.mimeType ?? '',
      size: parseVideoSize(data.size),
    });

    const videoId = randomUUID();
    const objectKey = `${ownerUserId}/${videoId}.${videoExtension(video.mimeType)}`;

    try {
      await this.prisma.video.create({
        data: {
          id: videoId,
          ownerUserId,
          title: video.title,
          description: video.description,
          bucket: this.storage.getVideosBucket(),
          objectKey,
          mimeType: video.mimeType,
          size: video.size,
          url: '',
          status: 'PENDING',
        },
      });
    } catch (error) {
      this.logger.error(
        `Не удалось сохранить видео ${videoId}: ${errorText(error)}`,
      );
      throw internal('Не удалось сохранить видео');
    }

    try {
      const uploadUrl = await this.storage.presignVideoPut({
        key: objectKey,
        mimeType: video.mimeType,
      });
      return { videoId, uploadUrl };
    } catch (error) {
      await this.prisma.video
        .delete({ where: { id: videoId } })
        .catch(() => undefined);
      this.logger.error(
        `Не удалось подписать загрузку ${objectKey}: ${errorText(error)}`,
      );
      throw internal('Не удалось подготовить загрузку');
    }
  }

  async completeVideoUpload(
    data: CompleteVideoUploadRequest,
    metadata: Metadata,
  ): Promise<VideoResponse> {
    const ownerUserId = requireUserId(metadata);
    const id = data.id?.trim() ?? '';
    if (!id) {
      throw invalid('Не указан идентификатор видео');
    }

    const video = await this.prisma.video.findUnique({ where: { id } });
    if (!video || video.ownerUserId !== ownerUserId) {
      throw notFound();
    }
    if (video.status === 'READY') {
      return toVideoResponse(video);
    }

    let actualSize: number | null;
    try {
      actualSize = await this.storage.headVideoSize(video.objectKey);
    } catch (error) {
      this.logger.error(
        `Не удалось проверить объект ${video.objectKey}: ${errorText(error)}`,
      );
      throw internal('Не удалось проверить загрузку');
    }

    if (actualSize === null) {
      throw new RpcException({
        code: status.FAILED_PRECONDITION,
        message: 'Файл не загружен',
      });
    }
    if (actualSize !== video.size) {
      throw invalid('Размер загруженного файла не совпадает');
    }

    const updated = await this.prisma.video.update({
      where: { id: video.id },
      data: {
        status: 'READY',
        url: this.storage.videoPublicUrl(video.objectKey),
      },
    });
    return toVideoResponse(updated);
  }

  async listVideos(metadata: Metadata): Promise<ListVideosResponse> {
    requireUserId(metadata);
    const videos = await this.prisma.video.findMany({
      where: { status: 'READY' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { videos: videos.map(toVideoResponse) };
  }

  async getVideo(
    data: GetVideoRequest,
    metadata: Metadata,
  ): Promise<VideoResponse> {
    requireUserId(metadata);
    const id = data.id?.trim() ?? '';
    const video = id
      ? await this.prisma.video.findUnique({ where: { id } })
      : null;
    if (!video || video.status !== 'READY') {
      throw notFound();
    }
    return toVideoResponse(video);
  }
}

function toVideoResponse(video: VideoRecord): VideoResponse {
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

function notFound(): RpcException {
  return new RpcException({
    code: status.NOT_FOUND,
    message: 'Видео не найдено',
  });
}

function invalid(message: string): RpcException {
  return new RpcException({
    code: status.INVALID_ARGUMENT,
    message,
  });
}

function internal(message: string): RpcException {
  return new RpcException({
    code: status.INTERNAL,
    message,
  });
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
