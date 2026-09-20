import { Field, ObjectType } from '@nestjs/graphql';

import { AccountTier } from './account-tier.enum';
import { TelegramProfileModel } from './telegram-profile.model';

@ObjectType()
export class UserModel {
  @Field()
  id!: string;

  @Field()
  email!: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  avatarUrl?: string;

  @Field(() => AccountTier)
  accountTier!: AccountTier;

  @Field(() => TelegramProfileModel, { nullable: true })
  telegram?: TelegramProfileModel;
}
