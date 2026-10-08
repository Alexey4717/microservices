import { Field, ID, ObjectType } from '@nestjs/graphql';

import { AiActionCardModel } from './ai-action.model';

@ObjectType()
export class AiAssistantReplyModel {
  @Field(() => ID)
  conversationId!: string;

  @Field(() => ID)
  messageId!: string;

  @Field()
  delta!: string;

  @Field()
  done!: boolean;

  @Field(() => String, { nullable: true })
  toolName?: string | null;

  @Field(() => AiActionCardModel, { nullable: true })
  action?: AiActionCardModel | null;
}
