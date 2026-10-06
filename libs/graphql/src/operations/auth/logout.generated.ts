import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';

export type LogoutMutationVariables = Types.Exact<{
  input: Types.InputMaybe<Types.LogoutInput>;
}>;

export type LogoutMutation = { __typename?: 'Mutation'; logout: boolean };

export const LogoutDocument = gql`
  mutation Logout($input: LogoutInput) {
    logout(input: $input)
  }
` as unknown as DocumentNode<LogoutMutation, LogoutMutationVariables>;
