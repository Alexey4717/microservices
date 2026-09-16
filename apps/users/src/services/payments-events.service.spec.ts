import { ClientProxy } from '@nestjs/microservices';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { USER_EVENTS } from '@libs/common';

import {
  ACCOUNT_TIER_PREMIUM,
  PaymentsEventsService,
} from './payments-events.service';
import { PrismaService } from './prisma.service';

describe('PaymentsEventsService.upgradeFromPayment', () => {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  const rmqClient = { emit: vi.fn() };
  let service: PaymentsEventsService;

  const payload = {
    paymentId: 'pay-1',
    userId: 'u1',
    productCode: 'PREMIUM',
    provider: 'STRIPE',
    status: 'SUCCEEDED',
    occurredAt: '2026-09-16T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PaymentsEventsService(
      prisma as unknown as PrismaService,
      rmqClient as unknown as ClientProxy,
    );
  });

  it('ставит accountTier=PREMIUM и эмитит user.updated', async () => {
    const user = {
      id: 'u1',
      email: 'a@example.com',
      name: 'Ann',
      avatarUrl: null,
      accountTier: 'BASE',
    };
    prisma.user.findUnique.mockResolvedValue(user);
    prisma.user.update.mockResolvedValue({
      ...user,
      accountTier: ACCOUNT_TIER_PREMIUM,
    });

    await service.upgradeFromPayment(payload);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { accountTier: ACCOUNT_TIER_PREMIUM },
    });
    expect(rmqClient.emit).toHaveBeenCalledWith(
      USER_EVENTS.UPDATED,
      expect.objectContaining({
        userId: 'u1',
        email: 'a@example.com',
        accountTier: ACCOUNT_TIER_PREMIUM,
      }),
    );
  });

  it('идемпотентен, если пользователь уже PREMIUM', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      name: 'Ann',
      avatarUrl: null,
      accountTier: ACCOUNT_TIER_PREMIUM,
    });

    await service.upgradeFromPayment(payload);

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(rmqClient.emit).not.toHaveBeenCalled();
  });

  it('игнорирует не-PREMIUM продукт', async () => {
    await service.upgradeFromPayment({
      ...payload,
      productCode: 'OTHER',
    });

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(rmqClient.emit).not.toHaveBeenCalled();
  });
});
