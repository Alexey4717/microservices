import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';
import { UserFieldsFragmentDoc } from '../user/user-fields.generated';

export type LoginWithTelegramMutationVariables = Types.Exact<{
  initData: Types.Scalars['String']['input'];
}>;

export type LoginWithTelegramMutation = {
  __typename?: 'Mutation';
  loginWithTelegram: {
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

export const LoginWithTelegramDocument = gql`
  mutation LoginWithTelegram($initData: String!) {
    loginWithTelegram(initData: $initData) {
      accessToken
      refreshToken
      user {
        ...UserFields
      }
    }
  }
  ${UserFieldsFragmentDoc}
` as unknown as DocumentNode<
  LoginWithTelegramMutation,
  LoginWithTelegramMutationVariables
>;
