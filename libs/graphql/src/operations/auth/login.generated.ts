import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';
import { UserFieldsFragmentDoc } from '../user/user-fields.generated';

export type LoginMutationVariables = Types.Exact<{
  input: Types.LoginInput;
}>;

export type LoginMutation = {
  __typename?: 'Mutation';
  login: {
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

export const LoginDocument = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      user {
        ...UserFields
      }
    }
  }
  ${UserFieldsFragmentDoc}
` as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
