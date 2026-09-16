import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';

import { isPaymentProvider } from '../payment-constants';
import type { PaymentProviderStrategy } from './payment-provider.strategy';
import { PaypalPaymentStrategy } from './paypal.strategy';
import { StripePaymentStrategy } from './stripe.strategy';

@Injectable()
export class PaymentProviderRegistry {
  private readonly byProvider: Map<string, PaymentProviderStrategy>;

  constructor(stripe: StripePaymentStrategy, paypal: PaypalPaymentStrategy) {
    this.byProvider = new Map<string, PaymentProviderStrategy>([
      [stripe.provider, stripe],
      [paypal.provider, paypal],
    ]);
  }

  get(provider: string): PaymentProviderStrategy {
    const normalized = provider.trim().toUpperCase();
    if (!isPaymentProvider(normalized)) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Unsupported payment provider',
      });
    }
    const found = this.byProvider.get(normalized);
    if (!found) {
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Unsupported payment provider',
      });
    }
    return found;
  }
}
