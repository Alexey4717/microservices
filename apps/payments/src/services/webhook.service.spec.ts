import { ClientProxy } from '@nestjs/microservices';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PAYMENT_EVENTS } from '@libs/common';

import { PAYMENT_STATUSES } from './payment-constants';
import { PrismaService } from './prisma.service';
import type { PaymentProviderStrategy } from './providers/payment-provider.strategy';
import { PaymentProviderRegistry } from './providers/provider-registry';
import { WebhookService } from './webhook.service';

describe('WebhookService idempotency', () => {
  const parseWebhook = vi.fn();
  const captureOrder = vi.fn();
  const strategy: PaymentProviderStrategy = {
    provider: 'STRIPE',
    createCheckout: vi.fn(),
    parseWebhook,
    captureOrder,
  };
  const prisma = {
    processedWebhook: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    payment: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  const rmqClient = { emit: vi.fn() };
  const providers = {
    get: vi.fn().mockReturnValue(strategy),
  };
  let service: WebhookService;

  const payment = {
    id: 'pay-1',
    userId: 'user-1',
    productCode: 'PREMIUM',
    provider: 'STRIPE',
    status: PAYMENT_STATUSES.PENDING,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    providers.get.mockReturnValue(strategy);
    prisma.processedWebhook.create.mockResolvedValue({});
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    service = new WebhookService(
      prisma as unknown as PrismaService,
      providers as unknown as PaymentProviderRegistry,
      rmqClient as unknown as ClientProxy,
    );
  });

  it('обрабатывает событие один раз и эмитит payment.completed', async () => {
    parseWebhook.mockResolvedValue({
      eventId: 'evt-1',
      externalId: 'cs_1',
      paymentId: 'pay-1',
      status: PAYMENT_STATUSES.SUCCEEDED,
    });
    prisma.processedWebhook.findUnique.mockResolvedValue(null);
    prisma.payment.findUnique.mockResolvedValue(payment);

    await service.handle('STRIPE', {}, Buffer.from('{}'));

    expect(rmqClient.emit).toHaveBeenCalledWith(
      PAYMENT_EVENTS.COMPLETED,
      expect.objectContaining({
        paymentId: 'pay-1',
        userId: 'user-1',
        productCode: 'PREMIUM',
        status: PAYMENT_STATUSES.SUCCEEDED,
      }),
    );
    expect(prisma.processedWebhook.create).toHaveBeenCalledWith({
      data: { provider: 'STRIPE', eventId: 'evt-1' },
    });
  });

  it('не повторяет side effects для уже обработанного eventId', async () => {
    parseWebhook.mockResolvedValue({
      eventId: 'evt-1',
      externalId: 'cs_1',
      paymentId: 'pay-1',
      status: PAYMENT_STATUSES.SUCCEEDED,
    });
    prisma.processedWebhook.findUnique.mockResolvedValue({
      id: 'wh-1',
      provider: 'STRIPE',
      eventId: 'evt-1',
    });

    await service.handle('STRIPE', {}, Buffer.from('{}'));

    expect(prisma.payment.findUnique).not.toHaveBeenCalled();
    expect(rmqClient.emit).not.toHaveBeenCalled();
    expect(prisma.processedWebhook.create).not.toHaveBeenCalled();
  });

  it('не эмитит повторно, если платёж уже SUCCEEDED', async () => {
    parseWebhook.mockResolvedValue({
      eventId: 'evt-2',
      externalId: 'cs_1',
      paymentId: 'pay-1',
      status: PAYMENT_STATUSES.SUCCEEDED,
    });
    prisma.processedWebhook.findUnique.mockResolvedValue(null);
    prisma.payment.findUnique.mockResolvedValue({
      ...payment,
      status: PAYMENT_STATUSES.SUCCEEDED,
    });

    await service.handle('STRIPE', {}, Buffer.from('{}'));

    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(rmqClient.emit).not.toHaveBeenCalled();
    expect(prisma.processedWebhook.create).toHaveBeenCalled();
  });
});
