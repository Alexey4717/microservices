import { registerEnumType } from '@nestjs/graphql';

export enum PaymentProvider {
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
}

registerEnumType(PaymentProvider, { name: 'PaymentProvider' });
