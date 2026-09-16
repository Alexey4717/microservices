export const PRODUCT_CODE_PREMIUM = 'PREMIUM';

export const PAYMENT_PROVIDERS = {
  STRIPE: 'STRIPE',
  PAYPAL: 'PAYPAL',
} as const;

export type PaymentProviderName =
  (typeof PAYMENT_PROVIDERS)[keyof typeof PAYMENT_PROVIDERS];

export const PAYMENT_STATUSES = {
  PENDING: 'PENDING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELED: 'CANCELED',
} as const;

export type PaymentStatus =
  (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES];

export function isPaymentProvider(value: string): value is PaymentProviderName {
  return (
    value === PAYMENT_PROVIDERS.STRIPE || value === PAYMENT_PROVIDERS.PAYPAL
  );
}

export function isPaymentStatus(value: string): value is PaymentStatus {
  return (
    value === PAYMENT_STATUSES.PENDING ||
    value === PAYMENT_STATUSES.SUCCEEDED ||
    value === PAYMENT_STATUSES.FAILED ||
    value === PAYMENT_STATUSES.CANCELED
  );
}
