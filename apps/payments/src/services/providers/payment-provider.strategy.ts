import type { IncomingHttpHeaders } from 'node:http';

import type { PaymentProviderName, PaymentStatus } from '../payment-constants';

export type CreateCheckoutInput = {
  paymentId: string;
  userId: string;
  productCode: string;
  amountMinor: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
};

export type CreateCheckoutResult = {
  externalId: string;
  checkoutUrl: string;
};

export type ParsedWebhook = {
  eventId: string;
  externalId: string | null;
  paymentId?: string;
  status: PaymentStatus | null;
  shouldCapture?: boolean;
};

export interface PaymentProviderStrategy {
  readonly provider: PaymentProviderName;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  parseWebhook(
    headers: IncomingHttpHeaders,
    rawBody: Buffer,
  ): Promise<ParsedWebhook>;
  captureOrder?(externalId: string): Promise<void>;
}
