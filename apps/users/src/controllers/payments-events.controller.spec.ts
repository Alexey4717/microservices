import { Logger } from '@nestjs/common';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymentsEventsController } from './payments-events.controller';

function rmqContext() {
  const ack = vi.fn();
  const nack = vi.fn();
  const context = {
    getChannelRef: () => ({ ack, nack }),
    getMessage: () => ({ fields: { deliveryTag: 1 } }),
  };
  return { ack, nack, context };
}

describe('PaymentsEventsController', () => {
  const upgradeFromPayment = vi.fn();
  let controller: PaymentsEventsController;

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
    upgradeFromPayment.mockResolvedValue(undefined);
    controller = new PaymentsEventsController({
      upgradeFromPayment,
    } as never);
  });

  it('ack после успешного upgrade', async () => {
    const { ack, nack, context } = rmqContext();
    await controller.handlePaymentCompleted(payload, context);
    expect(upgradeFromPayment).toHaveBeenCalledWith(payload);
    expect(ack).toHaveBeenCalledTimes(1);
    expect(nack).not.toHaveBeenCalled();
  });

  it('nack+requeue при ошибке обработки', async () => {
    const errorSpy = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const { ack, nack, context } = rmqContext();
    upgradeFromPayment.mockRejectedValue(new Error('P1001'));
    await controller.handlePaymentCompleted(payload, context);
    errorSpy.mockRestore();
    expect(ack).not.toHaveBeenCalled();
    expect(nack).toHaveBeenCalledWith(expect.anything(), false, true);
  });
});
