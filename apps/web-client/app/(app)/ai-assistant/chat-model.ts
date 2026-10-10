import type { AiConversationQuery } from '@libs/graphql/operations/ai-assistant/ai-conversation.generated';
import type { AiConversationsQuery } from '@libs/graphql/operations/ai-assistant/ai-conversations.generated';

export type ConversationItem = AiConversationsQuery['aiConversations'][number];
export type ConversationMessage =
  AiConversationQuery['aiConversation']['messages'][number];
export type ConversationAction =
  AiConversationQuery['aiConversation']['actions'][number];

export type ChatLine = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tools?: string[];
};

export type ChatAction = {
  id: string;
  type: string;
  title: string;
  status: 'pending' | 'confirmed' | 'rejected';
  busy: boolean;
  error: string | null;
};

export type ReplyInput = {
  conversationId: string;
  content: string;
  pagePath: string;
  temperature: number;
};
