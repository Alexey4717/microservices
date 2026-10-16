import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ClientProxy, RpcException } from '@nestjs/microservices';

import { Metadata, status } from '@grpc/grpc-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { USER_EVENTS } from '@libs/common';

import { AuthSupportHelper } from './auth-support.helper';
import { PrismaService } from './prisma.service';
import { UpdateMeUseCase } from './update-me.use-case';

describe('UpdateMeUseCase', () => {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  const rmqClient = { emit: vi.fn() };
  let useCase: UpdateMeUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    const authSupport = new AuthSupportHelper(
      prisma as unknown as PrismaService,
      {} as JwtService,
      { getOrThrow: vi.fn() } as unknown as ConfigService,
      rmqClient as unknown as ClientProxy,
    );
    useCase = new UpdateMeUseCase(
      prisma as unknown as PrismaService,
      authSupport,
    );
  });

  it('без user-id metadata — UNAUTHENTICATED', async () => {
    await expect(
      useCase.execute({ name: 'Ann' }, new Metadata()),
    ).rejects.toBeInstanceOf(RpcException);

    try {
      await useCase.execute({ name: 'Ann' }, new Metadata());
    } catch (error) {
      expect((error as RpcException).getError()).toMatchObject({
        code: status.UNAUTHENTICATED,
        message: 'Missing user-id metadata',
      });
    }
  });

  it('эмитит user.updated', async () => {
    const metadata = new Metadata();
    metadata.set('user-id', 'u1');
    const existing = {
      id: 'u1',
      email: 'a@example.com',
      name: 'Old',
      avatarUrl: null,
    };
    const updated = { ...existing, name: 'Ann' };
    prisma.user.findUnique.mockResolvedValue(existing);
    prisma.user.update.mockResolvedValue(updated);

    await expect(
      useCase.execute({ name: 'Ann' }, metadata),
    ).resolves.toMatchObject({
      id: 'u1',
      name: 'Ann',
    });
    expect(rmqClient.emit).toHaveBeenCalledWith(
      USER_EVENTS.UPDATED,
      expect.objectContaining({
        userId: 'u1',
        email: 'a@example.com',
        name: 'Ann',
      }),
    );
  });
});
