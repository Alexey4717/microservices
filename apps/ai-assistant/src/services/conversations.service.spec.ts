import { RpcException } from '@nestjs/microservices';

import { Metadata, status } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';

import { USER_ID_METADATA_KEY } from '@libs/common';

import { ConversationsService } from './conversations.service';

function metadata(userId: string): Metadata {
  const value = new Metadata();
  value.set(USER_ID_METADATA_KEY, userId);
  return value;
}

function createService() {
  const findFirst = vi.fn().mockResolvedValue(null);
  const conversationDelete = vi.fn();
  const messageCreate = vi.fn();
  const runTurn = vi.fn();
  const prisma = {
    conversation: {
      findFirst,
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: conversationDelete,
    },
    message: { create: messageCreate },
    tokenUsage: { findUnique: vi.fn(), upsert: vi.fn() },
  };
  const service = new ConversationsService(
    prisma as never,
    { createTurn: vi.fn() } as never,
    {
      schemaText: () => '',
      openAiTools: () => [],
      execute: vi.fn(),
    } as never,
    { retrieve: vi.fn().mockResolvedValue([]) },
    { fit: vi.fn() } as never,
    { get: vi.fn(), getOrThrow: vi.fn() } as never,
    { getVideo: vi.fn(), listVideos: vi.fn() } as never,
    { runTurn } as never,
  );
  return { service, findFirst, conversationDelete, messageCreate, runTurn };
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

  it('не пишется и не вызывает граф', async () => {
    const { service, findFirst, messageCreate, runTurn } = createService();

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
    expect(runTurn).not.toHaveBeenCalled();
  });

  it('не удаляется: выборка идёт по user id из metadata', async () => {
    const { service, findFirst, conversationDelete } = createService();

    await expect(
      service.deleteConversation({ id: 'foreign' }, metadata('owner')),
    ).rejects.toBeInstanceOf(RpcException);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'foreign', userId: 'owner' },
      }),
    );
    expect(conversationDelete).not.toHaveBeenCalled();
  });
});

describe('удаление своего диалога', () => {
  it('проверяет владельца и удаляет по id', async () => {
    const { service, findFirst, conversationDelete } = createService();
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');
    findFirst.mockResolvedValue({
      id: 'mine',
      userId: 'owner',
      title: 'Тема',
      createdAt,
      updatedAt,
      messages: [],
      pendingActions: [],
    });
    conversationDelete.mockResolvedValue({ id: 'mine' });

    await expect(
      service.deleteConversation({ id: 'mine' }, metadata('owner')),
    ).resolves.toEqual({
      id: 'mine',
      title: 'Тема',
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });

    expect(conversationDelete).toHaveBeenCalledWith({ where: { id: 'mine' } });
  });
});
