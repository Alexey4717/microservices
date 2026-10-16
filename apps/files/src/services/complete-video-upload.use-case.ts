import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { Metadata, status } from '@grpc/grpc-js';

import { requireUserId } from '@libs/common';
import type { CompleteVideoUploadRequest, VideoResponse } from '@libs/proto';

import {
  errorText,
  internal,
  invalid,
  notFound,
  toVideoResponse,
} from '../helpers/video-response';
import { PrismaService } from './prisma.service';
import { StorageService } from './storage.service';

@Injectable()
export class CompleteVideoUploadUseCase {
  private readonly logger = new Logger(CompleteVideoUploadUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async execute(
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
}
