import { RpcException } from '@nestjs/microservices';

import { Metadata, status } from '@grpc/grpc-js';
import { describe, expect, it, vi } from 'vitest';

import { USER_ID_METADATA_KEY } from '@libs/common';

import { PendingActionsService } from './pending-actions.service';

function metadata(userId: string): Metadata {
  const value = new Metadata();
  value.set(USER_ID_METADATA_KEY, userId);
  return value;
}

function createService() {
  const findFirst = vi.fn().mockResolvedValue(null);
  const updateMany = vi.fn();
  const createCheckout = vi.fn();
  const updateMe = vi.fn();
  const service = new PendingActionsService(
    { pendingAction: { findFirst, updateMany } } as never,
    { createCheckout } as never,
    { updateMe } as never,
    { getOrThrow: vi.fn() } as never,
  );
  return { service, findFirst, updateMany, createCheckout, updateMe };
}

describe('чужое действие', () => {
  it('не подтверждается и не вызывает оплату', async () => {
    const { service, findFirst, updateMany, createCheckout, updateMe } =
      createService();

    await expect(
      service.confirm({ actionId: 'foreign-action' }, metadata('attacker')),
    ).rejects.toBeInstanceOf(RpcException);

    try {
      await service.confirm(
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
    const { service, updateMany } = createService();

    await expect(
      service.reject({ actionId: 'foreign-action' }, metadata('attacker')),
    ).rejects.toBeInstanceOf(RpcException);

    expect(updateMany).not.toHaveBeenCalled();
  });
});
