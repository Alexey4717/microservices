import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';

export type UserFieldsFragment = {
  __typename?: 'UserModel';
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  accountTier: Types.AccountTier;
  telegram: {
    __typename?: 'TelegramProfile';
    userId: string;
    username: string | null;
    firstName: string | null;
    userLastName: string | null;
    photoUrl: string | null;
  } | null;
};

export const UserFieldsFragmentDoc = gql`
  fragment UserFields on UserModel {
    id
    email
    name
    avatarUrl
    accountTier
    telegram {
      userId
      username
      firstName
      userLastName
      photoUrl
    }
  }
` as unknown as DocumentNode<UserFieldsFragment, unknown>;
