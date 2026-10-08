import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';

export type AiAssistantReplySubscriptionVariables = Types.Exact<{
  conversationId: Types.Scalars['ID']['input'];
  content: Types.Scalars['String']['input'];
  pagePath: Types.InputMaybe<Types.Scalars['String']['input']>;
  temperature: Types.InputMaybe<Types.Scalars['Float']['input']>;
}>;

export type AiAssistantReplySubscription = {
  __typename?: 'Subscription';
  aiAssistantReply: {
    __typename?: 'AiAssistantReplyModel';
    conversationId: string;
    messageId: string;
    delta: string;
    done: boolean;
    toolName: string | null;
    action: {
      __typename?: 'AiActionCardModel';
      id: string;
      type: string;
      title: string;
    } | null;
  };
};

export const AiAssistantReplyDocument = gql`
  subscription AiAssistantReply(
    $conversationId: ID!
    $content: String!
    $pagePath: String
    $temperature: Float
  ) {
    aiAssistantReply(
      conversationId: $conversationId
      content: $content
      pagePath: $pagePath
      temperature: $temperature
    ) {
      conversationId
      messageId
      delta
      done
      toolName
      action {
        id
        type
        title
      }
    }
  }
` as unknown as DocumentNode<
  AiAssistantReplySubscription,
  AiAssistantReplySubscriptionVariables
>;
