import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';

export type DeleteAiConversationMutationVariables = Types.Exact<{
  id: Types.Scalars['ID']['input'];
}>;

export type DeleteAiConversationMutation = {
  __typename?: 'Mutation';
  deleteAiConversation: {
    __typename?: 'AiConversationModel';
    id: string;
    title: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

export const DeleteAiConversationDocument = gql`
  mutation DeleteAiConversation($id: ID!) {
    deleteAiConversation(id: $id) {
      id
      title
      createdAt
      updatedAt
    }
  }
` as unknown as DocumentNode<
  DeleteAiConversationMutation,
  DeleteAiConversationMutationVariables
>;
