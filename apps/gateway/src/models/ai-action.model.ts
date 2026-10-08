import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AiActionCardModel {
  @Field(() => ID)
  id!: string;

  @Field()
  type!: string;

  @Field()
  title!: string;
}

@ObjectType()
export class AiActionResultModel {
  @Field(() => ID)
  actionId!: string;

  @Field()
  type!: string;

  @Field()
  status!: string;

  @Field(() => String, { nullable: true })
  checkoutUrl?: string | null;

  @Field(() => String, { nullable: true })
  path?: string | null;
}

@ObjectType()
export class AiPendingActionModel {
  @Field(() => ID)
  id!: string;

  @Field()
  type!: string;

  @Field()
  title!: string;

  @Field()
  status!: string;
}
