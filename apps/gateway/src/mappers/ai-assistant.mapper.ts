import type {
  ConversationDetailResponse,
  ConversationResponse,
  MessageResponse,
} from '@libs/proto';

import { AiConversationDetailModel } from '../models/ai-conversation.model';
import { AiConversationModel } from '../models/ai-conversation.model';
import { AiMessageModel } from '../models/ai-conversation.model';

export function toAiConversationModel(
  conversation: ConversationResponse,
): AiConversationModel {
  return {
    id: conversation.id,
    title: conversation.title || null,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };
}

export function toAiMessageModel(message: MessageResponse): AiMessageModel {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    toolName: message.toolName || null,
    createdAt: message.createdAt,
  };
}

export function toAiConversationDetailModel(
  conversation: ConversationDetailResponse,
): AiConversationDetailModel {
  return {
    ...toAiConversationModel(conversation),
    messages: (conversation.messages ?? []).map(toAiMessageModel),
  };
}
