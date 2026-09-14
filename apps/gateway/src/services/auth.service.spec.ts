import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { status } from '@grpc/grpc-js';
import { GraphQLError } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service';
import { FilesGrpcService } from './files-grpc.service';
import { UserProjectionService } from './user-projection.service';
import { UsersGrpcService } from './users-grpc.service';

const INTERNAL_TOKEN = 'test-internal-token';

describe('AuthService', () => {
  let authService: AuthService;
  const usersGrpc = {
    getMe: vi.fn(),
    updateMe: vi.fn(),
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
        AuthService,
        { provide: UsersGrpcService, useValue: usersGrpc },
        { provide: FilesGrpcService, useValue: filesGrpc },
        { provide: UserProjectionService, useValue: userProjection },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: vi.fn().mockReturnValue(INTERNAL_TOKEN),
          },
        },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  describe('me', () => {
    it('me отдаёт проекцию, если users недоступен', async () => {
      usersGrpc.getMe.mockRejectedValue({ code: status.UNAVAILABLE });
      userProjection.findById.mockResolvedValue({
        id: 'u1',
        email: 'a@example.com',
        name: 'Ann',
        avatarUrl: '',
      });

      await expect(authService.me('u1')).resolves.toMatchObject({
        id: 'u1',
        email: 'a@example.com',
      });
      expect(userProjection.findById).toHaveBeenCalledWith('u1');
    });

    it('бросает ошибку, если users недоступен и проекции нет', async () => {
      usersGrpc.getMe.mockRejectedValue({ code: status.UNAVAILABLE });
      userProjection.findById.mockResolvedValue(null);

      await expect(authService.me('u1')).rejects.toBeInstanceOf(GraphQLError);
      expect(userProjection.findById).toHaveBeenCalledWith('u1');
    });

    it('не ходит в проекцию при ошибке не транспорта', async () => {
      const unauthenticated = { code: status.UNAUTHENTICATED };
      usersGrpc.getMe.mockRejectedValue(unauthenticated);

      await expect(authService.me('u1')).rejects.toBe(unauthenticated);
      expect(userProjection.findById).not.toHaveBeenCalled();
    });
  });

  describe('updateMe', () => {
    it('обновляет профиль через users gRPC и пишет проекцию', async () => {
      usersGrpc.updateMe.mockResolvedValue({
        id: 'u1',
        email: 'a@example.com',
        name: 'Ann',
        avatarUrl: '',
      });

      await expect(
        authService.updateMe('u1', { name: 'Ann' }),
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

  describe('uploadAvatar', () => {
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
        authService.uploadAvatar('u1', {
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
        authService.uploadAvatar('u1', {
          filename: 'a.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('x'),
        }),
      ).rejects.toBeInstanceOf(GraphQLError);
      expect(filesGrpc.uploadFile).not.toHaveBeenCalled();
    });
  });
});
