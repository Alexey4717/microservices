import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';
import { UserFieldsFragmentDoc } from './user-fields.generated';

export type MeQueryVariables = Types.Exact<{ [key: string]: never }>;

export type MeQuery = {
  __typename?: 'Query';
  me: {
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
};

export const MeDocument = gql`
  query Me {
    me {
      ...UserFields
    }
  }
  ${UserFieldsFragmentDoc}
` as unknown as DocumentNode<MeQuery, MeQueryVariables>;
