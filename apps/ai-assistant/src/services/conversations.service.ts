import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';

import { Metadata, status } from '@grpc/grpc-js';
import {
  type Conversation,
  type Message,
  MessageRole,
} from '@prisma/ai-assistant-client';
import { Observable, type Subscriber } from 'rxjs';

import type {
  ConversationDetailResponse,
  ConversationResponse,
  CreateConversationRequest,
  GetConversationRequest,
  ListConversationsRequest,
  ListConversationsResponse,
  MessageResponse,
  SendMessageEvent,
  SendMessageRequest,
} from '@libs/proto';

import { LlmService } from './llm.service';
import { PrismaService } from './prisma.service';
import { requireUserId } from './require-user-id';
import { RetrievalPort, formatRetrieval } from './retrieval.port';
import { SYSTEM_PROMPT } from './system-prompt';
import {
  TokenBudgetService,
  isOverDailyTokenLimit,
  utcDay,
} from './token-budget.service';
import { ToolRegistry } from './tool-registry';
import type { ToolSession } from './tool-types';
import {
  type StoredMessage,
  encodeToolCalls,
  encodeToolResult,
  titleFromUserMessage,
  toBudgetMessages,
  toLlmMessages,
} from './transcript';

const MAX_TOOL_ROUNDS = 4;

type ConversationWithMessages = Conversation & { messages: Message[] };

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly tools: ToolRegistry,
    private readonly retrieval: RetrievalPort,
    private readonly budget: TokenBudgetService,
    private readonly config: ConfigService,
  ) {}

  async createConversation(
    _data: CreateConversationRequest,
    metadata: Metadata,
  ): Promise<ConversationResponse> {
    const userId = requireUserId(metadata);
    const conversation = await this.prisma.conversation.create({
      data: { userId },
    });
    return toConversationResponse(conversation);
  }

  async listConversations(
    _data: ListConversationsRequest,
    metadata: Metadata,
  ): Promise<ListConversationsResponse> {
    const userId = requireUserId(metadata);
    const conversations = await this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return { conversations: conversations.map(toConversationResponse) };
  }

  async getConversation(
    data: GetConversationRequest,
    metadata: Metadata,
  ): Promise<ConversationDetailResponse> {
    const userId = requireUserId(metadata);
    const conversation = await this.loadOwned(data.id, userId);
    return toDetail(conversation);
  }

  sendMessage(
    data: SendMessageRequest,
    metadata: Metadata,
  ): Observable<SendMessageEvent> {
    return new Observable((subscriber) => {
      const abort = new AbortController();
      void this.runSend(data, metadata, subscriber, abort.signal)
        .then(() => {
          if (!subscriber.closed) {
            subscriber.complete();
          }
        })
        .catch((error: unknown) => {
          if (abort.signal.aborted || subscriber.closed) {
            return;
          }
          if (!(error instanceof RpcException)) {
            this.logger.error(
              error instanceof Error ? error.message : 'SendMessage failed',
            );
          }
          subscriber.error(asRpcException(error));
        });
      return () => abort.abort();
    });
  }

  private async runSend(
    data: SendMessageRequest,
    metadata: Metadata,
    subscriber: Subscriber<SendMessageEvent>,
    signal: AbortSignal,
  ): Promise<void> {
    const userId = requireUserId(metadata);
    const content = data.content?.trim() ?? '';
    const conversation = await this.loadOwned(data.conversationId, userId);
    if (!content) {
      throw rpcError(status.INVALID_ARGUMENT, 'Пустое сообщение');
    }

    const session = this.toolSession(userId);
    const fragments = await this.retrieval.retrieve({
      userId,
      query: content,
    });
    const retrievalText = formatRetrieval(fragments);
    const draftRows: StoredMessage[] = [
      ...conversation.messages.map(toStoredMessage),
      { role: 'user', content },
    ];
    const fitted = this.budget.fit({
      systemPrompt: SYSTEM_PROMPT,
      toolSchemaText: this.tools.schemaText(),
      retrievalText,
      history: toBudgetMessages(draftRows),
      contextTokens: this.readInt('LLM_CONTEXT_TOKENS'),
      maxOutputTokens: this.readInt('LLM_MAX_OUTPUT_TOKENS'),
    });
    if (fitted.overflow) {
      throw rpcError(
        status.FAILED_PRECONDITION,
        'Сообщение не помещается в контекст модели',
      );
    }

    await this.assertDailyLimit(userId);

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: MessageRole.user,
        content,
      },
    });
    if (!conversation.title) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { title: titleFromUserMessage(content) },
      });
    } else {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { title: conversation.title },
      });
    }

    const keptCount = draftRows.length - fitted.droppedCount;
    const keptRows = draftRows.slice(draftRows.length - keptCount);
    const llmMessages = [
      ...fitted.messages
        .filter((message) => message.role === 'system')
        .map((message) => ({
          role: 'system' as const,
          content: message.content,
        })),
      ...toLlmMessages(keptRows),
    ];
    if (!keptRows.some((row) => row === draftRows[draftRows.length - 1])) {
      llmMessages.push({ role: 'user', content });
    }

    const assistantMessageId = crypto.randomUUID();
    const openAiTools = this.tools.openAiTools();
    let toolRounds = 0;

    while (!signal.aborted) {
      await this.assertDailyLimit(userId);
      const allowTools = toolRounds < MAX_TOOL_ROUNDS;
      const turn = await this.llm.createTurn({
        messages: llmMessages,
        tools: allowTools ? openAiTools : [],
        signal,
        onTextDelta: (delta) => {
          this.emit(subscriber, {
            conversationId: conversation.id,
            messageId: assistantMessageId,
            delta,
            done: false,
          });
        },
      });
      if (signal.aborted) {
        return;
      }

      await this.addUsage(userId, turn.promptTokens, turn.completionTokens);

      if (turn.toolCalls.length > 0 && allowTools) {
        await this.prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: MessageRole.assistant,
            content: encodeToolCalls(turn.toolCalls),
            promptTokens: turn.promptTokens,
            completionTokens: turn.completionTokens,
          },
        });
        llmMessages.push({
          role: 'assistant',
          content: null,
          tool_calls: turn.toolCalls.map((call) => ({
            id: call.id,
            type: 'function' as const,
            function: { name: call.name, arguments: call.arguments },
          })),
        });

        for (const call of turn.toolCalls) {
          const args = parseToolArguments(call.arguments);
          const result = await this.tools.execute(call.name, args, session);
          const stored = encodeToolResult(call.id, result);
          await this.prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: MessageRole.tool,
              content: stored,
              toolName: call.name,
            },
          });
          llmMessages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: result,
          });
        }

        toolRounds += 1;
        continue;
      }

      const answer = turn.content;
      if (!turn.streamedText && answer) {
        this.emit(subscriber, {
          conversationId: conversation.id,
          messageId: assistantMessageId,
          delta: answer,
          done: false,
        });
      }

      await this.prisma.message.create({
        data: {
          id: assistantMessageId,
          conversationId: conversation.id,
          role: MessageRole.assistant,
          content: answer,
          promptTokens: turn.promptTokens,
          completionTokens: turn.completionTokens,
        },
      });
      this.emit(subscriber, {
        conversationId: conversation.id,
        messageId: assistantMessageId,
        delta: '',
        done: true,
      });
      return;
    }
  }

  private emit(
    subscriber: Subscriber<SendMessageEvent>,
    event: SendMessageEvent,
  ): void {
    if (!subscriber.closed) {
      subscriber.next(event);
    }
  }

  private async loadOwned(
    id: string,
    userId: string,
  ): Promise<ConversationWithMessages> {
    const conversationId = id?.trim();
    if (!conversationId) {
      throw rpcError(status.INVALID_ARGUMENT, 'Не указан диалог');
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) {
      throw rpcError(status.NOT_FOUND, 'Диалог не найден');
    }
    return conversation;
  }

  private toolSession(userId: string): ToolSession {
    return {
      userId,
      internalToken: this.config.getOrThrow<string>('INTERNAL_SERVICE_TOKEN'),
    };
  }

  private async assertDailyLimit(userId: string): Promise<void> {
    const limit = this.readInt('AI_ASSISTANT_DAILY_TOKEN_LIMIT');
    if (!isOverDailyTokenLimit(await this.usedToday(userId), limit)) {
      return;
    }
    throw rpcError(status.RESOURCE_EXHAUSTED, 'Превышен дневной лимит токенов');
  }

  private async usedToday(userId: string): Promise<number> {
    const row = await this.prisma.tokenUsage.findUnique({
      where: { userId_day: { userId, day: utcDay() } },
    });
    return (row?.promptTokens ?? 0) + (row?.completionTokens ?? 0);
  }

  private async addUsage(
    userId: string,
    promptTokens: number,
    completionTokens: number,
  ): Promise<void> {
    if (promptTokens <= 0 && completionTokens <= 0) {
      return;
    }
    const day = utcDay();
    await this.prisma.tokenUsage.upsert({
      where: { userId_day: { userId, day } },
      create: { userId, day, promptTokens, completionTokens },
      update: {
        promptTokens: { increment: promptTokens },
        completionTokens: { increment: completionTokens },
      },
    });
  }

  private readInt(key: string): number {
    const value = this.config.get<number | string>(key);
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) {
      throw rpcError(status.INTERNAL, `Не задан ${key}`);
    }
    return parsed;
  }
}

function toStoredMessage(message: Message): StoredMessage {
  return {
    role: message.role,
    content: message.content,
    toolName: message.toolName,
  };
}

function toConversationResponse(
  conversation: Conversation,
): ConversationResponse {
  return {
    id: conversation.id,
    title: conversation.title ?? '',
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

function toMessageResponse(message: Message): MessageResponse {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    toolName: message.toolName ?? '',
    createdAt: message.createdAt.toISOString(),
  };
}

function toDetail(
  conversation: ConversationWithMessages,
): ConversationDetailResponse {
  return {
    ...toConversationResponse(conversation),
    messages: conversation.messages.map(toMessageResponse),
  };
}

function parseToolArguments(raw: string): unknown {
  if (!raw.trim()) {
    return {};
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return {};
  }
}

function rpcError(code: status, message: string): RpcException {
  return new RpcException({ code, message });
}

function asRpcException(error: unknown): RpcException {
  if (error instanceof RpcException) {
    return error;
  }
  return rpcError(status.INTERNAL, 'Не удалось получить ответ ассистента');
}
