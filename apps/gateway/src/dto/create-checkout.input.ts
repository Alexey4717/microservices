import { Field, InputType } from '@nestjs/graphql';

import { IsEnum, IsOptional, IsString } from 'class-validator';

import { PaymentProvider } from '../models/payment-provider.enum';

@InputType()
export class CreateCheckoutInput {
  @Field(() => PaymentProvider)
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  productCode?: string;
}
