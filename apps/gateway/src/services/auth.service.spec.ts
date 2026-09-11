import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { status } from '@grpc/grpc-js';
import { GraphQLError } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service';
import { UserProjectionService } from './user-projection.service';
import { UsersGrpcService } from './users-grpc.service';

const INTERNAL_TOKEN = 'test-internal-token';

describe('AuthService', () => {
  let authService: AuthService;
  const usersGrpc = {
    getMe: vi.fn(),
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
});
