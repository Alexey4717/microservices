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

export interface PendingActionView {
  id: string;
  type: string;
  title: string;
  status: string;
}

export interface ConversationDetailResponse {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: MessageResponse[];
  actions?: PendingActionView[];
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
  pagePath?: string;
  temperature?: string;
}

export interface ActionCard {
  id: string;
  type: string;
  title: string;
}

export interface SendMessageEvent {
  conversationId: string;
  messageId: string;
  delta: string;
  done: boolean;
  toolName?: string;
  action?: ActionCard;
}

export interface ConfirmActionRequest {
  actionId: string;
}

export interface RejectActionRequest {
  actionId: string;
}

export interface ActionResult {
  actionId: string;
  type: string;
  status: string;
  checkoutUrl: string;
  path: string;
}
