import type { GetPaymentQuery } from '@libs/graphql/operations/payments/get-payment.generated';

export type PaymentModel = GetPaymentQuery['payment'];

export type PaymentStatus = PaymentModel['status'];

export type PaymentProvider = PaymentModel['provider'];

export function formatAmountMinor(
  amountMinor: number,
  currency: string,
): string {
  const major = amountMinor / 100;
  return `${major.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}\u00a0${currency}`;
}

export function formatPaymentDate(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Date(parsed).toLocaleString('ru-RU');
}

export const paymentProviderLabel: Record<PaymentProvider, string> = {
  STRIPE: 'Stripe',
  PAYPAL: 'PayPal',
};

export const paymentListStatusLabel: Record<PaymentStatus, string> = {
  PENDING: 'Ожидает оплаты',
  SUCCEEDED: 'Оплачен',
  FAILED: 'Ошибка',
  CANCELED: 'Отменён',
};

export const paymentOrderStatusLabel: Record<PaymentStatus, string> = {
  PENDING: 'Ожидаем подтверждение оплаты…',
  SUCCEEDED: 'Оплата прошла',
  FAILED: 'Оплата не прошла',
  CANCELED: 'Оплата отменена',
};
