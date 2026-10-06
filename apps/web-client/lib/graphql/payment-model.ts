import type { GetPaymentQuery } from '@libs/graphql/operations/payments/get-payment.generated';

export type PaymentModel = GetPaymentQuery['payment'];

export type PaymentStatus = PaymentModel['status'];

export type PaymentProvider = PaymentModel['provider'];
