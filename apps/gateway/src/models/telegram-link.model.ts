import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TelegramLink {
  @Field()
  url!: string;
}
