import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { CurrentUser } from '../decorators/current-user.decorator';
import { CreateCheckoutInput } from '../dto/create-checkout.input';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { CheckoutPayload } from '../models/checkout-payload.model';
import { PaymentProvider } from '../models/payment-provider.enum';
import { PaymentStatus } from '../models/payment-status.enum';
import { PaymentModel } from '../models/payment.model';
import { PaymentsGrpcService } from '../services/payments-grpc.service';
import type { AuthenticatedUser } from '../types/auth.types';

@Resolver()
export class PaymentsResolver {
  constructor(
    private readonly paymentsGrpc: PaymentsGrpcService,
    private readonly configService: ConfigService,
  ) {}

  @Mutation(() => CheckoutPayload)
  @UseGuards(GqlAuthGuard)
  async createCheckout(
    @Args('input') input: CreateCheckoutInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CheckoutPayload> {
    const result = await this.paymentsGrpc.createCheckout(
      {
        provider: input.provider,
        productCode: input.productCode,
      },
      this.internalToken(),
      user.userId,
    );
    return {
      paymentId: result.paymentId,
      checkoutUrl: result.checkoutUrl,
      provider: toPaymentProvider(result.provider),
      status: toPaymentStatus(result.status),
    };
  }

  @Query(() => [PaymentModel])
  @UseGuards(GqlAuthGuard)
  async myPayments(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaymentModel[]> {
    const result = await this.paymentsGrpc.listMyPayments(
      this.internalToken(),
      user.userId,
    );
    return (result.payments ?? []).map((payment) => ({
      id: payment.id,
      productCode: payment.productCode,
      provider: toPaymentProvider(payment.provider),
      status: toPaymentStatus(payment.status),
      amountMinor: Number(payment.amountMinor),
      currency: payment.currency,
      checkoutUrl: payment.checkoutUrl || undefined,
      createdAt: payment.createdAt,
    }));
  }

  private internalToken(): string {
    return this.configService.getOrThrow<string>('INTERNAL_SERVICE_TOKEN');
  }
}

function toPaymentProvider(value: string): PaymentProvider {
  return value === 'PAYPAL' ? PaymentProvider.PAYPAL : PaymentProvider.STRIPE;
}

function toPaymentStatus(value: string): PaymentStatus {
  if (value === 'SUCCEEDED') {
    return PaymentStatus.SUCCEEDED;
  }
  if (value === 'FAILED') {
    return PaymentStatus.FAILED;
  }
  if (value === 'CANCELED') {
    return PaymentStatus.CANCELED;
  }
  return PaymentStatus.PENDING;
}
