import { Field, ID, ObjectType } from '@nestjs/graphql';

import { AiPendingActionModel } from './ai-action.model';

@ObjectType()
export class AiMessageModel {
  @Field(() => ID)
  id!: string;

  @Field()
  role!: string;

  @Field()
  content!: string;

  @Field(() => String, { nullable: true })
  toolName?: string | null;

  @Field()
  createdAt!: string;
}

@ObjectType()
export class AiConversationModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  title?: string | null;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;
}

@ObjectType()
export class AiConversationDetailModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  title?: string | null;

  @Field()
  createdAt!: string;

  @Field()
  updatedAt!: string;

  @Field(() => [AiMessageModel])
  messages!: AiMessageModel[];

  @Field(() => [AiPendingActionModel])
  actions!: AiPendingActionModel[];
}
