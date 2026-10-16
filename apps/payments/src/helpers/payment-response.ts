import type { CheckoutResponse, PaymentResponse } from '@libs/proto';

export type PaymentRecord = {
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

export function toCheckoutResponse(payment: PaymentRecord): CheckoutResponse {
  return {
    paymentId: payment.id,
    checkoutUrl: payment.checkoutUrl ?? '',
    provider: payment.provider,
    status: payment.status,
  };
}

export function toPaymentResponse(payment: PaymentRecord): PaymentResponse {
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
