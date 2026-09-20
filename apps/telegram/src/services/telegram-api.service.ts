import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Api } from 'grammy';

export type TelegramChatSnapshot = {
  username?: string;
  firstName?: string;
  lastName?: string;
};

export type TelegramPhotoSize = {
  fileId: string;
};

@Injectable()
export class TelegramApiService implements OnModuleInit {
  private readonly logger = new Logger(TelegramApiService.name);
  private api!: Api;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.api = new Api(
      this.configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN'),
    );
  }

  async getChat(telegramId: string): Promise<TelegramChatSnapshot> {
    const chat = await this.api.getChat(Number(telegramId));
    if (chat.type !== 'private') {
      return {};
    }

    return {
      username: chat.username,
      firstName: chat.first_name,
      lastName: chat.last_name,
    };
  }

  async getProfilePhotoSizes(telegramId: string): Promise<TelegramPhotoSize[]> {
    const photos = await this.api.getUserProfilePhotos(Number(telegramId), {
      limit: 1,
    });
    const sizes = photos.photos[0] ?? [];
    return sizes.map((size) => ({ fileId: size.file_id }));
  }

  async downloadProfilePhoto(
    fileId: string,
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string } | null> {
    const file = await this.api.getFile(fileId);
    const filePath = file.file_path?.trim();
    if (!filePath) {
      return null;
    }

    const token = this.configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    const response = await fetch(telegramFileUrl(token, filePath));
    if (!response.ok) {
      this.logger.warn(
        `Не удалось скачать фото профиля Telegram (HTTP ${response.status})`,
      );
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const mimeType = mimeFromDownload(
      filePath,
      response.headers.get('content-type'),
    );
    return {
      buffer,
      mimeType,
      filename: filenameFromPath(filePath, mimeType),
    };
  }
}

function telegramFileUrl(token: string, filePath: string): string {
  return `https://api.telegram.org/file/bot${token}/${filePath}`;
}

function mimeFromDownload(
  filePath: string,
  contentType: string | null,
): string {
  const header = contentType?.split(';')[0]?.trim().toLowerCase();
  if (header?.startsWith('image/')) {
    return header;
  }

  const ext = filePath.split('.').pop()?.toLowerCase();
  if (ext === 'png') {
    return 'image/png';
  }
  if (ext === 'webp') {
    return 'image/webp';
  }
  if (ext === 'gif') {
    return 'image/gif';
  }
  return 'image/jpeg';
}

function filenameFromPath(filePath: string, mimeType: string): string {
  const base = filePath.split('/').pop()?.trim();
  if (base) {
    return base.slice(0, 255);
  }
  if (mimeType === 'image/png') {
    return 'telegram.png';
  }
  if (mimeType === 'image/webp') {
    return 'telegram.webp';
  }
  if (mimeType === 'image/gif') {
    return 'telegram.gif';
  }
  return 'telegram.jpg';
}
