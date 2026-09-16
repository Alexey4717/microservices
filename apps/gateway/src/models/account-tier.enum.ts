import { registerEnumType } from '@nestjs/graphql';

export enum AccountTier {
  BASE = 'BASE',
  PREMIUM = 'PREMIUM',
}

registerEnumType(AccountTier, { name: 'AccountTier' });
