import { RpcException } from '@nestjs/microservices';

import { Metadata, status } from '@grpc/grpc-js';

import { USER_ID_METADATA_KEY } from '@libs/common';

import { ConfirmActionUseCase } from './confirm-action.use-case';
import { PendingActionsHelper } from './pending-actions.helper';
import { RejectActionUseCase } from './reject-action.use-case';

function metadata(userId: string): Metadata {
  const value = new Metadata();
  value.set(USER_ID_METADATA_KEY, userId);
  return value;
}

function createFixtures() {
  const findFirst = vi.fn().mockResolvedValue(null);
  const updateMany = vi.fn();
  const createCheckout = vi.fn();
  const updateMe = vi.fn();
  const resumeTurn = vi.fn();
  const prisma = {
    pendingAction: { findFirst, updateMany },
    message: { create: vi.fn() },
    turnTrace: { create: vi.fn() },
    tokenUsage: { upsert: vi.fn() },
  };
  const helper = new PendingActionsHelper(
    prisma as never,
    { createCheckout } as never,
    { updateMe } as never,
    { getOrThrow: vi.fn() } as never,
    { resumeTurn } as never,
  );
  const confirm = new ConfirmActionUseCase(prisma as never, helper);
  const reject = new RejectActionUseCase(prisma as never, helper);
  return {
    confirm,
    reject,
    findFirst,
    updateMany,
    createCheckout,
    updateMe,
    resumeTurn,
  };
}

describe('чужое действие', () => {
  it('не подтверждается и не вызывает оплату', async () => {
    const { confirm, findFirst, updateMany, createCheckout, updateMe } =
      createFixtures();

    await expect(
      confirm.execute({ actionId: 'foreign-action' }, metadata('attacker')),
    ).rejects.toBeInstanceOf(RpcException);

    try {
      await confirm.execute(
        { actionId: 'foreign-action' },
        metadata('attacker'),
      );
    } catch (error) {
      expect((error as RpcException).getError()).toMatchObject({
        code: status.NOT_FOUND,
      });
    }

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: 'foreign-action',
        userId: 'attacker',
        status: 'pending',
      },
    });
    expect(updateMany).not.toHaveBeenCalled();
    expect(createCheckout).not.toHaveBeenCalled();
    expect(updateMe).not.toHaveBeenCalled();
  });

  it('не отклоняется чужим пользователем', async () => {
    const { reject, updateMany } = createFixtures();

    await expect(
      reject.execute({ actionId: 'foreign-action' }, metadata('attacker')),
    ).rejects.toBeInstanceOf(RpcException);

    expect(updateMany).not.toHaveBeenCalled();
  });

  it('при пустом threadId не делает resume', async () => {
    const { reject, findFirst, updateMany, resumeTurn } = createFixtures();
    findFirst.mockResolvedValue({
      id: 'action-1',
      conversationId: 'c1',
      userId: 'owner',
      type: 'navigate',
      payload: { path: '/profile', title: 'Перейти' },
      status: 'pending',
      threadId: null,
    });
    updateMany.mockResolvedValue({ count: 1 });

    await reject.execute({ actionId: 'action-1' }, metadata('owner'));

    expect(resumeTurn).not.toHaveBeenCalled();
  });
});
