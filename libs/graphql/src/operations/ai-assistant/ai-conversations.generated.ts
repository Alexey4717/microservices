import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';

export type AiConversationsQueryVariables = Types.Exact<{
  [key: string]: never;
}>;

export type AiConversationsQuery = {
  __typename?: 'Query';
  aiConversations: Array<{
    __typename?: 'AiConversationModel';
    id: string;
    title: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export const AiConversationsDocument = gql`
  query AiConversations {
    aiConversations {
      id
      title
      createdAt
      updatedAt
    }
  }
` as unknown as DocumentNode<
  AiConversationsQuery,
  AiConversationsQueryVariables
>;
