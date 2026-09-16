import { Field, ObjectType } from '@nestjs/graphql';

import { PaymentProvider } from './payment-provider.enum';
import { PaymentStatus } from './payment-status.enum';

@ObjectType()
export class CheckoutPayload {
  @Field()
  paymentId!: string;

  @Field()
  checkoutUrl!: string;

  @Field(() => PaymentProvider)
  provider!: PaymentProvider;

  @Field(() => PaymentStatus)
  status!: PaymentStatus;
}
