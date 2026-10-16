import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { status } from '@grpc/grpc-js';
import { GraphQLError } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateTelegramLinkUseCase } from './create-telegram-link.use-case';
import { FilesGrpcService } from './files-grpc.service';
import { GetMeUseCase } from './get-me.use-case';
import { LoginWithTelegramUseCase } from './login-with-telegram.use-case';
import { UpdateMeUseCase } from './update-me.use-case';
import { UploadAvatarUseCase } from './upload-avatar.use-case';
import { UserProjectionService } from './user-projection.service';
import { UserWriteThroughHelper } from './user-write-through.helper';
import { UsersGrpcService } from './users-grpc.service';

const INTERNAL_TOKEN = 'test-internal-token';

describe('Gateway auth use-cases', () => {
  let getMeUseCase: GetMeUseCase;
  let updateMeUseCase: UpdateMeUseCase;
  let uploadAvatarUseCase: UploadAvatarUseCase;
  let createTelegramLinkUseCase: CreateTelegramLinkUseCase;
  let loginWithTelegramUseCase: LoginWithTelegramUseCase;

  const usersGrpc = {
    getMe: vi.fn(),
    updateMe: vi.fn(),
    createTelegramLinkToken: vi.fn(),
    loginWithTelegram: vi.fn(),
  };
  const filesGrpc = {
    uploadFile: vi.fn(),
  };
  const userProjection = {
    findById: vi.fn(),
    upsertFromProfile: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UserWriteThroughHelper,
        GetMeUseCase,
        UpdateMeUseCase,
        UploadAvatarUseCase,
        CreateTelegramLinkUseCase,
        LoginWithTelegramUseCase,
        { provide: UsersGrpcService, useValue: usersGrpc },
        { provide: FilesGrpcService, useValue: filesGrpc },
        { provide: UserProjectionService, useValue: userProjection },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: vi.fn().mockReturnValue(INTERNAL_TOKEN),
            get: vi.fn((key: string) =>
              key === 'TELEGRAM_BOT_USERNAME' ? 'test_bot' : undefined,
            ),
          },
        },
      ],
    }).compile();

    getMeUseCase = moduleRef.get(GetMeUseCase);
    updateMeUseCase = moduleRef.get(UpdateMeUseCase);
    uploadAvatarUseCase = moduleRef.get(UploadAvatarUseCase);
    createTelegramLinkUseCase = moduleRef.get(CreateTelegramLinkUseCase);
    loginWithTelegramUseCase = moduleRef.get(LoginWithTelegramUseCase);
  });

  describe('GetMeUseCase', () => {
    it('me отдаёт проекцию, если users недоступен', async () => {
      usersGrpc.getMe.mockRejectedValue({ code: status.UNAVAILABLE });
      userProjection.findById.mockResolvedValue({
        id: 'u1',
        email: 'a@example.com',
        name: 'Ann',
        avatarUrl: '',
      });

      await expect(getMeUseCase.execute('u1')).resolves.toMatchObject({
        id: 'u1',
        email: 'a@example.com',
      });
      expect(userProjection.findById).toHaveBeenCalledWith('u1');
    });

    it('бросает ошибку, если users недоступен и проекции нет', async () => {
      usersGrpc.getMe.mockRejectedValue({ code: status.UNAVAILABLE });
      userProjection.findById.mockResolvedValue(null);

      await expect(getMeUseCase.execute('u1')).rejects.toBeInstanceOf(
        GraphQLError,
      );
      expect(userProjection.findById).toHaveBeenCalledWith('u1');
    });

    it('не ходит в проекцию при ошибке не транспорта', async () => {
      const unauthenticated = { code: status.UNAUTHENTICATED };
      usersGrpc.getMe.mockRejectedValue(unauthenticated);

      await expect(getMeUseCase.execute('u1')).rejects.toBe(unauthenticated);
      expect(userProjection.findById).not.toHaveBeenCalled();
    });
  });

  describe('UpdateMeUseCase', () => {
    it('обновляет профиль через users gRPC и пишет проекцию', async () => {
      usersGrpc.updateMe.mockResolvedValue({
        id: 'u1',
        email: 'a@example.com',
        name: 'Ann',
        avatarUrl: '',
      });

      await expect(
        updateMeUseCase.execute('u1', { name: 'Ann' }),
      ).resolves.toMatchObject({
        id: 'u1',
        name: 'Ann',
      });
      expect(usersGrpc.updateMe).toHaveBeenCalledWith(
        { name: 'Ann' },
        INTERNAL_TOKEN,
        'u1',
      );
      expect(userProjection.upsertFromProfile).toHaveBeenCalled();
    });
  });

  describe('UploadAvatarUseCase', () => {
    it('загружает файл через files gRPC и ставит avatarUrl', async () => {
      const url = 'http://localhost:9000/avatars/u1/file.jpg';
      filesGrpc.uploadFile.mockResolvedValue({ url });
      usersGrpc.updateMe.mockResolvedValue({
        id: 'u1',
        email: 'a@example.com',
        name: '',
        avatarUrl: url,
      });

      const buffer = Buffer.from('jpeg-bytes');
      await expect(
        uploadAvatarUseCase.execute('u1', {
          filename: 'a.jpg',
          mimeType: 'image/jpeg',
          buffer,
        }),
      ).resolves.toMatchObject({ avatarUrl: url });

      expect(filesGrpc.uploadFile).toHaveBeenCalledWith(
        {
          filename: 'a.jpg',
          mimeType: 'image/jpeg',
          content: buffer,
        },
        INTERNAL_TOKEN,
        'u1',
      );
      expect(usersGrpc.updateMe).toHaveBeenCalledWith(
        { avatarUrl: url },
        INTERNAL_TOKEN,
        'u1',
      );
    });

    it('отклоняет неподдерживаемый mime', async () => {
      await expect(
        uploadAvatarUseCase.execute('u1', {
          filename: 'a.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('x'),
        }),
      ).rejects.toBeInstanceOf(GraphQLError);
      expect(filesGrpc.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('CreateTelegramLinkUseCase', () => {
    it('строит t.me ссылку из токена users', async () => {
      usersGrpc.createTelegramLinkToken.mockResolvedValue({ token: 'abc' });

      await expect(createTelegramLinkUseCase.execute('u1')).resolves.toEqual({
        url: 'https://t.me/test_bot?start=link_abc',
      });
      expect(usersGrpc.createTelegramLinkToken).toHaveBeenCalledWith(
        INTERNAL_TOKEN,
        'u1',
      );
    });
  });

  describe('LoginWithTelegramUseCase', () => {
    it('проксирует initData в users gRPC и пишет проекцию', async () => {
      const user = {
        id: 'u1',
        email: 'a@example.com',
        name: 'Ann',
        avatarUrl: '',
        accountTier: 'BASE',
      };
      usersGrpc.loginWithTelegram.mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
        user,
      });

      await expect(
        loginWithTelegramUseCase.execute('query_id=1&hash=abc'),
      ).resolves.toMatchObject({
        accessToken: 'access',
        user: { id: 'u1' },
      });
      expect(usersGrpc.loginWithTelegram).toHaveBeenCalledWith(
        { initData: 'query_id=1&hash=abc' },
        INTERNAL_TOKEN,
      );
      expect(userProjection.upsertFromProfile).toHaveBeenCalledWith(user);
    });
  });
});
