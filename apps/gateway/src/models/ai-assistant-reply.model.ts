import { Field, ID, ObjectType } from '@nestjs/graphql';

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
}
