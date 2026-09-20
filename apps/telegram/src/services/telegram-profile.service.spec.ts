import { ConfigService } from '@nestjs/config';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FilesGrpcService } from './files-grpc.service';
import { TelegramApiService } from './telegram-api.service';
import { TelegramProfileService } from './telegram-profile.service';
import { UsersGrpcService } from './users-grpc.service';

const INTERNAL_TOKEN = 'internal-token';

describe('TelegramProfileService', () => {
  const telegramApi = {
    getChat: vi.fn(),
    getProfilePhotoSizes: vi.fn(),
    downloadProfilePhoto: vi.fn(),
  };
  const usersGrpc = {
    upsertTelegramProfile: vi.fn(),
  };
  const filesGrpc = {
    uploadFile: vi.fn(),
  };
  let service: TelegramProfileService;

  beforeEach(() => {
    vi.clearAllMocks();
    usersGrpc.upsertTelegramProfile.mockResolvedValue({ id: 'u1' });
    service = new TelegramProfileService(
      telegramApi as unknown as TelegramApiService,
      usersGrpc as unknown as UsersGrpcService,
      filesGrpc as unknown as FilesGrpcService,
      {
        getOrThrow: vi.fn().mockReturnValue(INTERNAL_TOKEN),
      } as unknown as ConfigService,
    );
  });

  it('пишет имена из getChat и публичный URL после files gRPC', async () => {
    telegramApi.getChat.mockResolvedValue({
      username: 'ann_tg',
      firstName: 'Ann',
      lastName: 'Smith',
    });
    const photo = Buffer.from('jpeg-bytes');
    telegramApi.getProfilePhotoSizes.mockResolvedValue([{ fileId: 'file-1' }]);
    telegramApi.downloadProfilePhoto.mockResolvedValue({
      buffer: photo,
      mimeType: 'image/jpeg',
      filename: 'photo.jpg',
    });
    filesGrpc.uploadFile.mockResolvedValue({
      url: 'https://cdn.example/tg.jpg',
    });

    await service.sync('100', 'u1');

    expect(filesGrpc.uploadFile).toHaveBeenCalledWith(
      {
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        content: photo,
      },
      INTERNAL_TOKEN,
      'u1',
    );
    expect(usersGrpc.upsertTelegramProfile).toHaveBeenCalledWith(
      {
        telegramId: '100',
        username: 'ann_tg',
        firstName: 'Ann',
        lastName: 'Smith',
        photoUrl: 'https://cdn.example/tg.jpg',
      },
      INTERNAL_TOKEN,
    );
  });

  it('без фото всё равно сохраняет telegram id и имена', async () => {
    telegramApi.getChat.mockResolvedValue({
      username: undefined,
      firstName: 'Ann',
      lastName: undefined,
    });
    telegramApi.getProfilePhotoSizes.mockResolvedValue([]);

    await service.sync('100', 'u1');

    expect(filesGrpc.uploadFile).not.toHaveBeenCalled();
    expect(usersGrpc.upsertTelegramProfile).toHaveBeenCalledWith(
      {
        telegramId: '100',
        username: '',
        firstName: 'Ann',
        lastName: '',
        photoUrl: '',
      },
      INTERNAL_TOKEN,
    );
  });

  it('ошибка getChat не роняет sync и не затирает имена в запросе', async () => {
    telegramApi.getChat.mockRejectedValue(new Error('getChat failed'));
    telegramApi.getProfilePhotoSizes.mockRejectedValue(
      new Error('photos failed'),
    );

    await service.sync('100', 'u1');

    expect(usersGrpc.upsertTelegramProfile).toHaveBeenCalledWith(
      { telegramId: '100' },
      INTERNAL_TOKEN,
    );
  });
});
