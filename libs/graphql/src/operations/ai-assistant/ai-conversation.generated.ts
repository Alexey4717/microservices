import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';

export type AiConversationQueryVariables = Types.Exact<{
  id: Types.Scalars['ID']['input'];
}>;

export type AiConversationQuery = {
  __typename?: 'Query';
  aiConversation: {
    __typename?: 'AiConversationDetailModel';
    id: string;
    title: string | null;
    createdAt: string;
    updatedAt: string;
    messages: Array<{
      __typename?: 'AiMessageModel';
      id: string;
      role: string;
      content: string;
      toolName: string | null;
      createdAt: string;
    }>;
    actions: Array<{
      __typename?: 'AiPendingActionModel';
      id: string;
      type: string;
      title: string;
      status: string;
    }>;
  };
};

export const AiConversationDocument = gql`
  query AiConversation($id: ID!) {
    aiConversation(id: $id) {
      id
      title
      createdAt
      updatedAt
      messages {
        id
        role
        content
        toolName
        createdAt
      }
      actions {
        id
        type
        title
        status
      }
    }
  }
` as unknown as DocumentNode<AiConversationQuery, AiConversationQueryVariables>;
