export type CreateConversationRequest = Record<string, never>;

export type ListConversationsRequest = Record<string, never>;

export interface GetConversationRequest {
  id: string;
}

export interface ConversationResponse {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListConversationsResponse {
  conversations: ConversationResponse[];
}

export interface MessageResponse {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  toolName: string;
  createdAt: string;
}

export interface ConversationDetailResponse {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: MessageResponse[];
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
}

export interface SendMessageEvent {
  conversationId: string;
  messageId: string;
  delta: string;
  done: boolean;
}
