import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';

export type RejectAiActionMutationVariables = Types.Exact<{
  actionId: Types.Scalars['ID']['input'];
}>;

export type RejectAiActionMutation = {
  __typename?: 'Mutation';
  rejectAiAction: {
    __typename?: 'AiActionResultModel';
    actionId: string;
    type: string;
    status: string;
    checkoutUrl: string | null;
    path: string | null;
  };
};

export const RejectAiActionDocument = gql`
  mutation RejectAiAction($actionId: ID!) {
    rejectAiAction(actionId: $actionId) {
      actionId
      type
      status
      checkoutUrl
      path
    }
  }
` as unknown as DocumentNode<
  RejectAiActionMutation,
  RejectAiActionMutationVariables
>;
