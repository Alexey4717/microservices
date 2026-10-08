import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';

export type ConfirmAiActionMutationVariables = Types.Exact<{
  actionId: Types.Scalars['ID']['input'];
}>;

export type ConfirmAiActionMutation = {
  __typename?: 'Mutation';
  confirmAiAction: {
    __typename?: 'AiActionResultModel';
    actionId: string;
    type: string;
    status: string;
    checkoutUrl: string | null;
    path: string | null;
  };
};

export const ConfirmAiActionDocument = gql`
  mutation ConfirmAiAction($actionId: ID!) {
    confirmAiAction(actionId: $actionId) {
      actionId
      type
      status
      checkoutUrl
      path
    }
  }
` as unknown as DocumentNode<
  ConfirmAiActionMutation,
  ConfirmAiActionMutationVariables
>;
