import type {
  Conversation,
  Message,
  PendingAction,
} from '@prisma/ai-assistant-client';

import type {
  ConversationDetailResponse,
  ConversationResponse,
  MessageResponse,
  PendingActionView,
} from '@libs/proto';

import { readActionTitle } from '../services/propose-actions';
import type { StoredMessage } from '../services/transcript';

export type ConversationWithMessages = Conversation & {
  messages: Message[];
  pendingActions: PendingAction[];
};

export function toStoredMessage(message: Message): StoredMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    toolName: message.toolName,
  };
}

export function toConversationResponse(
  conversation: Conversation,
): ConversationResponse {
  return {
    id: conversation.id,
    title: conversation.title ?? '',
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

export function toMessageResponse(message: Message): MessageResponse {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    toolName: message.toolName ?? '',
    createdAt: message.createdAt.toISOString(),
  };
}

export function toPendingView(action: PendingAction): PendingActionView {
  return {
    id: action.id,
    type: action.type,
    title: readActionTitle(action.payload, action.type),
    status: action.status,
  };
}

export function toDetail(
  conversation: ConversationWithMessages,
): ConversationDetailResponse {
  return {
    ...toConversationResponse(conversation),
    messages: conversation.messages.map(toMessageResponse),
    actions: (conversation.pendingActions ?? []).map(toPendingView),
  };
}
