import { Field, Int, ObjectType } from '@nestjs/graphql';

import { PaymentProvider } from './payment-provider.enum';
import { PaymentStatus } from './payment-status.enum';

@ObjectType()
export class PaymentModel {
  @Field()
  id!: string;

  @Field()
  productCode!: string;

  @Field(() => PaymentProvider)
  provider!: PaymentProvider;

  @Field(() => PaymentStatus)
  status!: PaymentStatus;

  @Field(() => Int)
  amountMinor!: number;

  @Field()
  currency!: string;

  @Field({ nullable: true })
  checkoutUrl?: string;

  @Field()
  createdAt!: string;
}
