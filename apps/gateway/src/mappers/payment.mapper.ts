import type { PaymentResponse } from '@libs/proto';

import { PaymentProvider } from '../models/payment-provider.enum';
import { PaymentStatus } from '../models/payment-status.enum';
import { PaymentModel } from '../models/payment.model';

export function toPaymentModel(payment: PaymentResponse): PaymentModel {
  return {
    id: payment.id,
    productCode: payment.productCode,
    provider: toPaymentProvider(payment.provider),
    status: toPaymentStatus(payment.status),
    amountMinor: Number(payment.amountMinor),
    currency: payment.currency,
    checkoutUrl: payment.checkoutUrl || undefined,
    createdAt: payment.createdAt,
  };
}

export function toPaymentProvider(value: string): PaymentProvider {
  return value === 'PAYPAL' ? PaymentProvider.PAYPAL : PaymentProvider.STRIPE;
}

export function toPaymentStatus(value: string): PaymentStatus {
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
