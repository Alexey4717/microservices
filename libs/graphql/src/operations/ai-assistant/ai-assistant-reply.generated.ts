import { gql } from '@apollo/client';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

import type * as Types from '../../schema-types';

export type AiAssistantReplySubscriptionVariables = Types.Exact<{
  conversationId: Types.Scalars['ID']['input'];
  content: Types.Scalars['String']['input'];
}>;

export type AiAssistantReplySubscription = {
  __typename?: 'Subscription';
  aiAssistantReply: {
    __typename?: 'AiAssistantReplyModel';
    conversationId: string;
    messageId: string;
    delta: string;
    done: boolean;
  };
};

export const AiAssistantReplyDocument = gql`
  subscription AiAssistantReply($conversationId: ID!, $content: String!) {
    aiAssistantReply(conversationId: $conversationId, content: $content) {
      conversationId
      messageId
      delta
      done
    }
  }
` as unknown as DocumentNode<
  AiAssistantReplySubscription,
  AiAssistantReplySubscriptionVariables
>;
