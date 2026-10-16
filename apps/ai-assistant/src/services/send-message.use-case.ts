import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';

import { Metadata, status } from '@grpc/grpc-js';
import { type Conversation, MessageRole } from '@prisma/ai-assistant-client';
import { Observable, type Subscriber } from 'rxjs';

import { requireUserId } from '@libs/common';
import type { SendMessageEvent, SendMessageRequest } from '@libs/proto';

import { toStoredMessage } from '../helpers/conversation-mappers';
import { asRpcException, rpcError } from '../helpers/rpc-errors';
import { AgentGraphService } from './agent-graph.service';
import { ConversationAccessHelper } from './conversation-access.helper';
import {
  SUMMARY_INPUT_TOKENS,
  SUMMARY_INSTRUCTION,
  formatSummaryRequest,
  selectUncoveredMessages,
  takeSummaryPrefix,
} from './conversation-summary';
import { FilesGrpcService } from './files-grpc.service';
import {
  type FocusedVideoSnapshot,
  formatFocusedVideoPrompt,
  parseFocusedEntity,
} from './focused-entity';
import { LlmService } from './llm.service';
import { PrismaService } from './prisma.service';
import { normalizeAppPagePath } from './propose-actions';
import { RetrievalPort, formatRetrieval } from './retrieval.port';
import { buildSystemPrompt } from './system-prompt';
import { parseTemperatureInput, resolveTemperature } from './temperature';
import {
  type FitHistoryResult,
  TokenBudgetService,
  isOverDailyTokenLimit,
  utcDay,
} from './token-budget.service';
import { ToolRegistry } from './tool-registry';
import type { ToolSession } from './tool-types';
import {
  type StoredMessage,
  titleFromUserMessage,
  toBudgetMessages,
  toLlmMessages,
} from './transcript';
import { toVideoToolSnapshot } from './video-tool';

@Injectable()
export class SendMessageUseCase {
  private readonly logger = new Logger(SendMessageUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmService,
    private readonly tools: ToolRegistry,
    private readonly retrieval: RetrievalPort,
    private readonly budget: TokenBudgetService,
    private readonly config: ConfigService,
    private readonly files: FilesGrpcService,
    private readonly agentGraph: AgentGraphService,
    private readonly conversationAccess: ConversationAccessHelper,
  ) {}

  execute(
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
    const conversation = await this.conversationAccess.loadOwned(
      data.conversationId,
      userId,
    );
    if (!content) {
      throw rpcError(status.INVALID_ARGUMENT, 'Пустое сообщение');
    }

    const pagePath = normalizeAppPagePath(data.pagePath);
    const temperature = resolveTemperature(
      parseTemperatureInput(data.temperature),
      this.readTemperature(),
    );
    const session = this.toolSession(userId, conversation.id, pagePath);
    const focusedEntity = await this.prefetchFocusedEntity(pagePath);
    const fragments = await this.retrieval.retrieve({
      userId,
      query: content,
    });
    const retrievalText = formatRetrieval(fragments);
    const chunkIds = fragments.flatMap((fragment) =>
      fragment.id ? [fragment.id] : [],
    );
    const draftRows: StoredMessage[] = [
      ...conversation.messages.map(toStoredMessage),
      { role: 'user', content },
    ];
    const prepared = await this.prepareHistory({
      conversation,
      draftRows,
      retrievalText,
      pagePath,
      focusedEntity,
      userId,
      signal,
    });
    if (signal.aborted) {
      return;
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

    const { fitted, systemPrompt } = prepared;
    const keptCount = draftRows.length - fitted.droppedCount;
    const keptRows = draftRows.slice(draftRows.length - keptCount);
    const llmMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...(retrievalText
        ? [{ role: 'system' as const, content: retrievalText }]
        : []),
      ...toLlmMessages(keptRows),
    ];
    if (!keptRows.some((row) => row === draftRows[draftRows.length - 1])) {
      llmMessages.push({ role: 'user', content });
    }

    const assistantMessageId = crypto.randomUUID();
    await this.assertDailyLimit(userId);

    const turn = await this.agentGraph.runTurn({
      messages: llmMessages,
      assistantMessageId,
      temperature,
      pagePath,
      chunkIds,
      session: {
        ...session,
        threadId: assistantMessageId,
      },
      signal,
      onTextDelta: (delta) => {
        this.emit(subscriber, {
          conversationId: conversation.id,
          messageId: assistantMessageId,
          delta,
          done: false,
          toolName: '',
        });
      },
      onToolName: (toolName) => {
        this.emit(subscriber, {
          conversationId: conversation.id,
          messageId: assistantMessageId,
          delta: '',
          done: false,
          toolName,
        });
      },
      onAction: (action) => {
        this.emit(subscriber, {
          conversationId: conversation.id,
          messageId: assistantMessageId,
          delta: '',
          done: false,
          toolName: '',
          action,
        });
      },
    });
    if (signal.aborted) {
      return;
    }

    await this.addUsage(userId, turn.promptTokens, turn.completionTokens);

    if (turn.interrupted) {
      if (turn.action) {
        this.emit(subscriber, {
          conversationId: conversation.id,
          messageId: assistantMessageId,
          delta: '',
          done: false,
          toolName: '',
          action: {
            id: turn.action.actionId,
            type: turn.action.type,
            title: turn.action.title,
          },
        });
      }
      this.emit(subscriber, {
        conversationId: conversation.id,
        messageId: assistantMessageId,
        delta: '',
        done: true,
        toolName: '',
      });
      return;
    }

    const answer = turn.content;
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
    await this.storeTrace({
      conversationId: conversation.id,
      messageId: assistantMessageId,
      toolNames: turn.toolNames,
      chunkIds: turn.chunkIds,
      pagePath,
      temperature,
    });
    this.emit(subscriber, {
      conversationId: conversation.id,
      messageId: assistantMessageId,
      delta: '',
      done: true,
      toolName: '',
    });
  }

  private async prepareHistory(input: {
    conversation: Conversation;
    draftRows: StoredMessage[];
    retrievalText: string;
    pagePath: string | null;
    focusedEntity: string | null;
    userId: string;
    signal: AbortSignal;
  }): Promise<{ fitted: FitHistoryResult; systemPrompt: string }> {
    let summary = input.conversation.summary;
    let covers = input.conversation.summaryCoversMessageId;
    let systemPrompt = buildSystemPrompt({
      pagePath: input.pagePath,
      focusedEntity: input.focusedEntity,
      summary,
    });
    let fitted = this.fitHistory(
      systemPrompt,
      input.retrievalText,
      input.draftRows,
    );
    this.assertFits(fitted);

    for (let pass = 0; pass < 2 && !input.signal.aborted; pass += 1) {
      const uncovered = selectUncoveredMessages(
        input.draftRows,
        fitted.droppedCount,
        covers,
      );
      const batch = takeSummaryPrefix(uncovered, SUMMARY_INPUT_TOKENS);
      const lastId = batch[batch.length - 1]?.id;
      if (!lastId) {
        break;
      }

      await this.assertDailyLimit(input.userId);
      let summarized: string | undefined;
      try {
        const turn = await this.llm.summarize({
          instruction: SUMMARY_INSTRUCTION,
          content: formatSummaryRequest(summary, batch),
          signal: input.signal,
        });
        if (input.signal.aborted) {
          break;
        }
        await this.addUsage(
          input.userId,
          turn.promptTokens,
          turn.completionTokens,
        );
        summarized = turn.content.trim().slice(0, 4000);
      } catch (error) {
        if (input.signal.aborted || error instanceof RpcException) {
          throw error;
        }
        this.logger.warn(
          `Сводка истории пропущена: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
        break;
      }
      if (!summarized) {
        break;
      }

      summary = summarized;
      covers = lastId;
      await this.prisma.conversation.update({
        where: { id: input.conversation.id },
        data: { summary, summaryCoversMessageId: covers },
      });
      systemPrompt = buildSystemPrompt({
        pagePath: input.pagePath,
        focusedEntity: input.focusedEntity,
        summary,
      });
      fitted = this.fitHistory(
        systemPrompt,
        input.retrievalText,
        input.draftRows,
      );
      this.assertFits(fitted);
    }

    return { fitted, systemPrompt };
  }

  private async prefetchFocusedEntity(
    pagePath: string | null,
  ): Promise<string | null> {
    const focused = parseFocusedEntity(pagePath);
    if (!focused || focused.type !== 'video') {
      return null;
    }

    const internalToken = this.config.getOrThrow<string>(
      'INTERNAL_SERVICE_TOKEN',
    );
    try {
      const video = await this.files.getVideo(focused.id, internalToken);
      const snapshot: FocusedVideoSnapshot = toVideoToolSnapshot(video);
      return formatFocusedVideoPrompt(snapshot);
    } catch (error) {
      this.logger.warn(
        `Prefetch видео ${focused.id} не удался: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      return formatFocusedVideoPrompt(null);
    }
  }

  private fitHistory(
    systemPrompt: string,
    retrievalText: string,
    draftRows: StoredMessage[],
  ): FitHistoryResult {
    return this.budget.fit({
      systemPrompt,
      toolSchemaText: this.tools.schemaText(),
      retrievalText,
      history: toBudgetMessages(draftRows),
      contextTokens: this.readInt('LLM_CONTEXT_TOKENS'),
      maxOutputTokens: this.readInt('LLM_MAX_OUTPUT_TOKENS'),
    });
  }

  private assertFits(fitted: FitHistoryResult): void {
    if (!fitted.overflow) {
      return;
    }
    throw rpcError(
      status.FAILED_PRECONDITION,
      'Сообщение не помещается в контекст модели',
    );
  }

  private async storeTrace(input: {
    conversationId: string;
    messageId: string;
    toolNames: string[];
    chunkIds: string[];
    pagePath: string | null;
    temperature: number;
  }): Promise<void> {
    try {
      await this.prisma.turnTrace.create({
        data: {
          conversationId: input.conversationId,
          messageId: input.messageId,
          toolNames: input.toolNames,
          chunkIds: input.chunkIds,
          pagePath: input.pagePath,
          temperature: input.temperature,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Траектория хода не сохранена: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
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

  private toolSession(
    userId: string,
    conversationId: string,
    pagePath: string | null,
  ): ToolSession {
    return {
      userId,
      conversationId,
      pagePath,
      internalToken: this.config.getOrThrow<string>('INTERNAL_SERVICE_TOKEN'),
    };
  }

  private readTemperature(): number {
    const value = this.config.get<number | string>('LLM_TEMPERATURE');
    return resolveTemperature(parseTemperatureInput(value), 0.2);
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
