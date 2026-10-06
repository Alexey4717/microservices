import { RpcException } from '@nestjs/microservices';

import { Metadata, status } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { USER_ID_METADATA_KEY } from '@libs/common';

import { ConversationsService } from './conversations.service';

function metadata(userId: string): Metadata {
  const value = new Metadata();
  value.set(USER_ID_METADATA_KEY, userId);
  return value;
}

function createService() {
  const findFirst = vi.fn().mockResolvedValue(null);
  const messageCreate = vi.fn();
  const createTurn = vi.fn();
  const prisma = {
    conversation: {
      findFirst,
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    message: { create: messageCreate },
    tokenUsage: { findUnique: vi.fn(), upsert: vi.fn() },
  };
  const service = new ConversationsService(
    prisma as never,
    { createTurn } as never,
    {
      schemaText: () => '',
      openAiTools: () => [],
      execute: vi.fn(),
    } as never,
    { retrieve: vi.fn().mockResolvedValue([]) },
    { fit: vi.fn() } as never,
    { get: vi.fn(), getOrThrow: vi.fn() } as never,
  );
  return { service, findFirst, messageCreate, createTurn };
}

describe('чужой диалог', () => {
  it('не читается: выборка идёт по user id из metadata', async () => {
    const { service, findFirst } = createService();

    await expect(
      service.getConversation({ id: 'foreign' }, metadata('owner')),
    ).rejects.toBeInstanceOf(RpcException);

    try {
      await service.getConversation({ id: 'foreign' }, metadata('owner'));
    } catch (error) {
      expect((error as RpcException).getError()).toMatchObject({
        code: status.NOT_FOUND,
      });
    }

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'foreign', userId: 'owner' },
      }),
    );
  });

  it('не пишется и не вызывает модель', async () => {
    const { service, findFirst, messageCreate, createTurn } = createService();

    await expect(
      firstValueFrom(
        service.sendMessage(
          { conversationId: 'foreign', content: 'привет' },
          metadata('owner'),
        ),
      ),
    ).rejects.toBeInstanceOf(RpcException);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'foreign', userId: 'owner' },
      }),
    );
    expect(messageCreate).not.toHaveBeenCalled();
    expect(createTurn).not.toHaveBeenCalled();
  });
});
