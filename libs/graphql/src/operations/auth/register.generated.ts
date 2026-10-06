import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';
import { UserFieldsFragmentDoc } from '../user/user-fields.generated';

export type RegisterMutationVariables = Types.Exact<{
  input: Types.RegisterInput;
}>;

export type RegisterMutation = {
  __typename?: 'Mutation';
  register: {
    __typename?: 'AuthPayload';
    accessToken: string;
    refreshToken: string;
    user: {
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
};

export const RegisterDocument = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      accessToken
      refreshToken
      user {
        ...UserFields
      }
    }
  }
  ${UserFieldsFragmentDoc}
` as unknown as DocumentNode<RegisterMutation, RegisterMutationVariables>;
