import type { UserFieldsFragment } from '@libs/graphql/operations/user/user-fields.generated';

export type AuthUser = UserFieldsFragment;

export type AccountTier = AuthUser['accountTier'];

export function toAccountTier(value: unknown): AccountTier {
  return value === 'PREMIUM' ? 'PREMIUM' : 'BASE';
}
