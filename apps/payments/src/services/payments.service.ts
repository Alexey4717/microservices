import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';

import { Metadata, status } from '@grpc/grpc-js';

import { USER_ID_METADATA_KEY, getMetadataValue } from '@libs/common';
import type {
  CheckoutResponse,
  CreateCheckoutRequest,
  GetPaymentRequest,
  ListMyPaymentsRequest,
  ListMyPaymentsResponse,
  PaymentResponse,
} from '@libs/proto';

import { PAYMENT_STATUSES, PRODUCT_CODE_PREMIUM } from './payment-constants';
import { paymentReturnUrl } from './payment-return-url';
import { PrismaService } from './prisma.service';
import { PaymentProviderRegistry } from './providers/provider-registry';

type PaymentRecord = {
  id: string;
  userId: string;
  productCode: string;
  provider: string;
  status: string;
  amountMinor: number;
  currency: string;
  checkoutUrl: string | null;
  createdAt: Date;
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: PaymentProviderRegistry,
    private readonly configService: ConfigService,
  ) {}

  async createCheckout(
    data: CreateCheckoutRequest,
    metadata: Metadata,
  ): Promise<CheckoutResponse> {
    const userId = requireUserId(metadata);
    const provider = this.providers.get(data.provider ?? '').provider;
    const productCode = normalizeProductCode(data.productCode);

    const product = await this.prisma.product.findUnique({
      where: { code: productCode },
    });
    if (!product || !product.active) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Product not found',
      });
    }

    const succeeded = await this.prisma.payment.findFirst({
      where: {
        userId,
        productCode,
        status: PAYMENT_STATUSES.SUCCEEDED,
      },
    });
    if (succeeded) {
      throw new RpcException({
        code: status.ALREADY_EXISTS,
        message: 'Product already purchased',
      });
    }

    const pending = await this.prisma.payment.findFirst({
      where: {
        userId,
        productCode,
        provider,
        status: PAYMENT_STATUSES.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (pending?.checkoutUrl) {
      return toCheckoutResponse(pending);
    }

    const payment =
      pending ??
      (await this.prisma.payment.create({
        data: {
          userId,
          productCode,
          provider,
          status: PAYMENT_STATUSES.PENDING,
          amountMinor: product.amountMinor,
          currency: product.currency,
        },
      }));

    let returnUrl: string;
    try {
      returnUrl = paymentReturnUrl(
        this.configService.getOrThrow<string>('CORS_ORIGIN'),
        payment.id,
      );
    } catch {
      throw new RpcException({
        code: status.FAILED_PRECONDITION,
        message: 'Invalid CORS_ORIGIN',
      });
    }

    try {
      const created = await this.providers.get(provider).createCheckout({
        paymentId: payment.id,
        userId,
        productCode,
        amountMinor: product.amountMinor,
        currency: product.currency,
        successUrl: returnUrl,
        cancelUrl: returnUrl,
      });

      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerCheckoutId: created.externalId,
          checkoutUrl: created.checkoutUrl,
        },
      });
      return toCheckoutResponse(updated);
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      this.logger.error(
        `Не удалось создать checkout: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new RpcException({
        code: status.INTERNAL,
        message: 'Failed to create checkout',
      });
    }
  }

  async getPayment(
    data: GetPaymentRequest,
    metadata: Metadata,
  ): Promise<PaymentResponse> {
    const userId = requireUserId(metadata);
    const id = data.id?.trim();
    if (!id) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Payment id is required',
      });
    }

    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment || payment.userId !== userId) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Payment not found',
      });
    }

    return toPaymentResponse(payment);
  }

  async listMyPayments(
    _data: ListMyPaymentsRequest,
    metadata: Metadata,
  ): Promise<ListMyPaymentsResponse> {
    const userId = requireUserId(metadata);
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return { payments: payments.map(toPaymentResponse) };
  }
}

function requireUserId(metadata: Metadata): string {
  const userId = getMetadataValue(metadata, USER_ID_METADATA_KEY);
  if (!userId) {
    throw new RpcException({
      code: status.UNAUTHENTICATED,
      message: 'Missing user-id metadata',
    });
  }
  return userId;
}

function normalizeProductCode(productCode: string | undefined): string {
  const trimmed = productCode?.trim();
  return trimmed ? trimmed.toUpperCase() : PRODUCT_CODE_PREMIUM;
}

function toCheckoutResponse(payment: PaymentRecord): CheckoutResponse {
  return {
    paymentId: payment.id,
    checkoutUrl: payment.checkoutUrl ?? '',
    provider: payment.provider,
    status: payment.status,
  };
}

function toPaymentResponse(payment: PaymentRecord): PaymentResponse {
  return {
    id: payment.id,
    userId: payment.userId,
    productCode: payment.productCode,
    provider: payment.provider,
    status: payment.status,
    amountMinor: payment.amountMinor,
    currency: payment.currency,
    checkoutUrl: payment.checkoutUrl ?? '',
    createdAt: payment.createdAt.toISOString(),
  };
}
