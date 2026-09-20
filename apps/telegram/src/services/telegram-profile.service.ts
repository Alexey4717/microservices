import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AVATAR_MAX_BYTES, isAllowedAvatarMime } from '@libs/common';
import type { UpsertTelegramProfileRequest } from '@libs/proto';

import { FilesGrpcService } from './files-grpc.service';
import { TelegramApiService } from './telegram-api.service';
import { UsersGrpcService } from './users-grpc.service';

@Injectable()
export class TelegramProfileService {
  private readonly logger = new Logger(TelegramProfileService.name);

  constructor(
    private readonly telegramApi: TelegramApiService,
    private readonly usersGrpc: UsersGrpcService,
    private readonly filesGrpc: FilesGrpcService,
    private readonly configService: ConfigService,
  ) {}

  async sync(telegramId: string, userId: string): Promise<void> {
    const snapshot: UpsertTelegramProfileRequest = {
      telegramId,
    };

    try {
      const chat = await this.telegramApi.getChat(telegramId);
      snapshot.username = chat.username?.replace(/^@/, '').trim() ?? '';
      snapshot.firstName = chat.firstName?.trim() ?? '';
      snapshot.lastName = chat.lastName?.trim() ?? '';
    } catch (error) {
      this.logger.warn(
        `getChat не удался для telegram id ${telegramId}: ${errorMessage(error)}`,
      );
    }

    try {
      snapshot.photoUrl = await this.uploadProfilePhoto(telegramId, userId);
    } catch (error) {
      this.logger.warn(
        `Не удалось обновить фото Telegram ${telegramId}: ${errorMessage(error)}`,
      );
    }

    await this.usersGrpc.upsertTelegramProfile(snapshot, this.internalToken());
  }

  private async uploadProfilePhoto(
    telegramId: string,
    userId: string,
  ): Promise<string> {
    const sizes = await this.telegramApi.getProfilePhotoSizes(telegramId);
    const largest = sizes[sizes.length - 1];
    if (!largest) {
      return '';
    }

    const downloaded = await this.telegramApi.downloadProfilePhoto(
      largest.fileId,
    );
    if (!downloaded) {
      throw new Error('empty telegram photo download');
    }
    if (!isAllowedAvatarMime(downloaded.mimeType)) {
      throw new Error(`unsupported telegram photo type ${downloaded.mimeType}`);
    }
    if (downloaded.buffer.length > AVATAR_MAX_BYTES) {
      throw new Error('telegram photo too large');
    }

    const uploaded = await this.filesGrpc.uploadFile(
      {
        filename: downloaded.filename,
        mimeType: downloaded.mimeType,
        content: downloaded.buffer,
      },
      this.internalToken(),
      userId,
    );

    return uploaded.url ?? '';
  }

  private internalToken(): string {
    return this.configService.getOrThrow<string>('INTERNAL_SERVICE_TOKEN');
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
