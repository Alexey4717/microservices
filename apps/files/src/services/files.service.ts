import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { Metadata, status } from '@grpc/grpc-js';
import { randomUUID } from 'node:crypto';

import {
  USER_ID_METADATA_KEY,
  avatarExtension,
  getMetadataValue,
} from '@libs/common';
import type { UploadFileRequest, UploadFileResponse } from '@libs/proto';

import { assertAvatarUpload, toContentBuffer } from './file-validation';
import { PrismaService } from './prisma.service';
import { StorageService } from './storage.service';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async uploadFile(
    data: UploadFileRequest,
    metadata: Metadata,
  ): Promise<UploadFileResponse> {
    const ownerUserId = getMetadataValue(metadata, USER_ID_METADATA_KEY);
    if (!ownerUserId) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Missing user-id metadata',
      });
    }

    const content = toContentBuffer(data.content);
    const mimeType = data.mimeType?.trim() ?? '';
    assertAvatarUpload(mimeType, content.length);

    const extension = avatarExtension(mimeType);
    const fileId = randomUUID();
    const objectKey = `${ownerUserId}/${fileId}.${extension}`;
    const originalName = (data.filename?.trim() || `avatar.${extension}`).slice(
      0,
      255,
    );

    let url: string;
    try {
      url = await this.storage.putObject({
        key: objectKey,
        body: content,
        mimeType,
      });
    } catch (error) {
      this.logger.error(
        `Не удалось загрузить объект ${objectKey}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Failed to store file',
      });
    }

    const record = await this.prisma.file.create({
      data: {
        id: fileId,
        ownerUserId,
        bucket: this.storage.getBucket(),
        objectKey,
        originalName,
        mimeType,
        size: content.length,
        url,
      },
    });

    return {
      id: record.id,
      url: record.url,
      objectKey: record.objectKey,
      mimeType: record.mimeType,
      size: record.size,
    };
  }
}
