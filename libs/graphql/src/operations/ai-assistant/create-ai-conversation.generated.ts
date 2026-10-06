import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';

export type CreateAiConversationMutationVariables = Types.Exact<{
  [key: string]: never;
}>;

export type CreateAiConversationMutation = {
  __typename?: 'Mutation';
  createAiConversation: {
    __typename?: 'AiConversationModel';
    id: string;
    title: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

export const CreateAiConversationDocument = gql`
  mutation CreateAiConversation {
    createAiConversation {
      id
      title
      createdAt
      updatedAt
    }
  }
` as unknown as DocumentNode<
  CreateAiConversationMutation,
  CreateAiConversationMutationVariables
>;
