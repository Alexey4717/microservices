import type {
  ActionCard,
  ActionResult,
  ConversationDetailResponse,
  ConversationResponse,
  MessageResponse,
  PendingActionView,
  SendMessageEvent,
} from '@libs/proto';

import { AiActionResultModel } from '../models/ai-action.model';
import { AiPendingActionModel } from '../models/ai-action.model';
import { AiAssistantReplyModel } from '../models/ai-assistant-reply.model';
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
    actions: (conversation.actions ?? []).map(toPendingActionModel),
  };
}

export function toAiAssistantReplyModel(
  event: SendMessageEvent,
): AiAssistantReplyModel {
  return {
    conversationId: event.conversationId,
    messageId: event.messageId,
    delta: event.delta ?? '',
    done: Boolean(event.done),
    toolName: event.toolName || null,
    action: presentAction(event.action),
  };
}

export function toAiActionResult(result: ActionResult): AiActionResultModel {
  return {
    actionId: result.actionId,
    type: result.type,
    status: result.status,
    checkoutUrl: result.checkoutUrl || null,
    path: result.path || null,
  };
}

function toPendingActionModel(action: PendingActionView): AiPendingActionModel {
  return {
    id: action.id,
    type: action.type,
    title: action.title,
    status: action.status,
  };
}

function presentAction(action: ActionCard | undefined) {
  if (!action?.id) {
    return null;
  }
  return {
    id: action.id,
    type: action.type,
    title: action.title,
  };
}

export async function* mapAssistantEvents(
  source: AsyncIterable<SendMessageEvent>,
): AsyncGenerator<AiAssistantReplyModel> {
  for await (const event of source) {
    yield toAiAssistantReplyModel(event);
  }
}
