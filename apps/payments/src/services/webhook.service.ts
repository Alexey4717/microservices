import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

import type { IncomingHttpHeaders } from 'node:http';

import {
  PAYMENTS_RMQ_CLIENT,
  PAYMENT_EVENTS,
  type PaymentEventPayload,
} from '@libs/common';

import {
  PAYMENT_STATUSES,
  type PaymentProviderName,
  type PaymentStatus,
} from './payment-constants';
import { nextPaymentStatus } from './payment-status';
import { PrismaService } from './prisma.service';
import { PaymentProviderRegistry } from './providers/provider-registry';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: PaymentProviderRegistry,
    @Inject(PAYMENTS_RMQ_CLIENT) private readonly rmqClient: ClientProxy,
  ) {}

  async handle(
    provider: PaymentProviderName,
    headers: IncomingHttpHeaders,
    rawBody: Buffer,
  ): Promise<void> {
    const strategy = this.providers.get(provider);
    const parsed = await strategy.parseWebhook(headers, rawBody);

    const alreadyProcessed = await this.prisma.processedWebhook.findUnique({
      where: {
        provider_eventId: { provider, eventId: parsed.eventId },
      },
    });
    if (alreadyProcessed) {
      return;
    }

    if (parsed.shouldCapture && parsed.externalId) {
      await strategy.captureOrder?.(parsed.externalId);
    }

    if (parsed.status) {
      const payment = await this.findPayment(
        provider,
        parsed.paymentId,
        parsed.externalId,
      );
      if (payment) {
        const applied = await this.applyStatus(payment.id, parsed.status);
        if (applied) {
          this.emitStatus(payment, parsed.status);
        }
      } else {
        this.logger.warn(
          `Платёж не найден для ${provider} event ${parsed.eventId}`,
        );
      }
    }

    await this.markProcessed(provider, parsed.eventId);
  }

  private async findPayment(
    provider: string,
    paymentId: string | undefined,
    externalId: string | null,
  ) {
    if (paymentId) {
      const byId = await this.prisma.payment.findUnique({
        where: { id: paymentId },
      });
      if (byId) {
        return byId;
      }
    }
    if (!externalId) {
      return null;
    }
    return this.prisma.payment.findUnique({
      where: {
        provider_providerCheckoutId: {
          provider,
          providerCheckoutId: externalId,
        },
      },
    });
  }

  private async applyStatus(
    paymentId: string,
    incoming: PaymentStatus,
  ): Promise<boolean> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) {
      return false;
    }

    const next = nextPaymentStatus(payment.status, incoming);
    if (!next) {
      return false;
    }

    const updated = await this.prisma.payment.updateMany({
      where: { id: paymentId, status: payment.status },
      data: { status: next },
    });
    return updated.count > 0;
  }

  private emitStatus(
    payment: {
      id: string;
      userId: string;
      productCode: string;
      provider: string;
    },
    status: PaymentStatus,
  ): void {
    const routingKey =
      status === PAYMENT_STATUSES.SUCCEEDED
        ? PAYMENT_EVENTS.COMPLETED
        : status === PAYMENT_STATUSES.FAILED
          ? PAYMENT_EVENTS.FAILED
          : PAYMENT_EVENTS.CANCELED;

    const payload: PaymentEventPayload = {
      paymentId: payment.id,
      userId: payment.userId,
      productCode: payment.productCode,
      provider: payment.provider,
      status,
      occurredAt: new Date().toISOString(),
    };
    this.rmqClient.emit(routingKey, payload);
  }

  private async markProcessed(
    provider: string,
    eventId: string,
  ): Promise<void> {
    try {
      await this.prisma.processedWebhook.create({
        data: { provider, eventId },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return;
      }
      throw error;
    }
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}
