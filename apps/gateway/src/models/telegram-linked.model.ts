import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TelegramLinkedPayload {
  @Field()
  ok!: boolean;
}
