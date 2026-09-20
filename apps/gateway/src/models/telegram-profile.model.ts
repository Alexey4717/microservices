import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('TelegramProfile')
export class TelegramProfileModel {
  @Field()
  userId!: string;

  @Field({ nullable: true })
  username?: string;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  userLastName?: string;

  @Field({ nullable: true })
  photoUrl?: string;
}
