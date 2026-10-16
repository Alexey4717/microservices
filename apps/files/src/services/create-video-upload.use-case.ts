import { Injectable, Logger } from '@nestjs/common';

import { Metadata } from '@grpc/grpc-js';
import { randomUUID } from 'node:crypto';

import { requireUserId } from '@libs/common';
import type {
  CreateVideoUploadRequest,
  CreateVideoUploadResponse,
} from '@libs/proto';

import { errorText, internal } from '../helpers/video-response';
import { PrismaService } from './prisma.service';
import { StorageService } from './storage.service';
import {
  assertVideoUpload,
  parseVideoSize,
  videoExtension,
} from './video-validation';

@Injectable()
export class CreateVideoUploadUseCase {
  private readonly logger = new Logger(CreateVideoUploadUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async execute(
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
}
