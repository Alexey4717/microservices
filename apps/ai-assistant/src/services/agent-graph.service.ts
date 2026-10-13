import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import {
  type CompiledAgentGraph,
  buildAgentGraph,
  finalAssistantText,
  llmMessagesToLangChain,
  loadLangGraphModules,
  readInterruptAction,
} from './agent-graph';
import type {
  AgentState,
  InterruptActionPayload,
  ResumeDecision,
} from './agent-state';
import { PrismaService } from './prisma.service';
import { ToolRegistry } from './tool-registry';
import type { ActionProposal, ToolSession } from './tool-types';

export interface RunTurnInput {
  messages: ChatCompletionMessageParam[];
  assistantMessageId: string;
  temperature: number;
  pagePath: string | null;
  chunkIds: string[];
  session: ToolSession;
  signal?: AbortSignal;
  onTextDelta?: (delta: string) => void;
  onToolName?: (toolName: string) => void;
  onAction?: (action: ActionProposal) => void;
}

export interface RunTurnResult {
  interrupted: boolean;
  action: InterruptActionPayload | null;
  content: string;
  toolNames: string[];
  chunkIds: string[];
  temperature: number;
  pagePath: string | null;
  promptTokens: number;
  completionTokens: number;
  assistantMessageId: string;
}

@Injectable()
export class AgentGraphService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentGraphService.name);
  private graph: CompiledAgentGraph | null = null;
  private checkpointer: { end?: () => Promise<void> } | null = null;
  private messagesMod: typeof import('@langchain/core/messages') | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tools: ToolRegistry,
  ) {}

  async onModuleInit(): Promise<void> {
    const databaseUrl = this.config.getOrThrow<string>(
      'AI_ASSISTANT_DATABASE_URL',
    );
    const { PostgresSaver } =
      await import('@langchain/langgraph-checkpoint-postgres');
    const checkpointer = PostgresSaver.fromConnString(databaseUrl);
    await checkpointer.setup();
    this.checkpointer = checkpointer;

    const modules = await loadLangGraphModules();
    this.messagesMod = modules.messages;

    this.graph = await buildAgentGraph(
      {
        tools: this.tools,
        prisma: this.prisma,
        llm: {
          baseURL: this.config.getOrThrow<string>('LLM_BASE_URL'),
          apiKey: this.config.getOrThrow<string>('LLM_API_KEY'),
          model: this.config.getOrThrow<string>('LLM_MODEL'),
          maxOutputTokens: this.readInt('LLM_MAX_OUTPUT_TOKENS'),
        },
      },
      checkpointer,
    );
    this.logger.log('LangGraph checkpointer и граф инициализированы');
  }

  async onModuleDestroy(): Promise<void> {
    await this.checkpointer?.end?.().catch(() => undefined);
  }

  async runTurn(input: RunTurnInput): Promise<RunTurnResult> {
    const graph = this.requireGraph();
    const messages = this.requireMessages();
    const threadId = input.assistantMessageId;
    const initial: AgentState = {
      messages: llmMessagesToLangChain(input.messages, messages),
      toolRound: 0,
      toolNames: [],
      chunkIds: input.chunkIds,
      assistantMessageId: threadId,
      temperature: input.temperature,
      pagePath: input.pagePath,
      promptTokens: 0,
      completionTokens: 0,
    };

    const result = await graph.invokeTurn(initial, {
      configurable: {
        thread_id: threadId,
        runtime: {
          session: {
            ...input.session,
            threadId,
          },
          onTextDelta: input.onTextDelta,
          onToolName: input.onToolName,
          onAction: input.onAction,
          signal: input.signal,
        },
      },
      signal: input.signal,
    });

    return toRunTurnResult(result, threadId, input);
  }

  async resumeTurn(
    threadId: string,
    decision: ResumeDecision,
    session: ToolSession,
  ): Promise<RunTurnResult | null> {
    const id = threadId.trim();
    if (!id) {
      return null;
    }

    const graph = this.requireGraph();
    const result = await graph.invokeTurn(
      { resume: decision },
      {
        configurable: {
          thread_id: id,
          runtime: {
            session: {
              ...session,
              threadId: id,
            },
          },
        },
      },
    );

    return toRunTurnResult(result, id, {
      chunkIds: result.chunkIds ?? [],
      temperature: result.temperature ?? 0.2,
      pagePath: result.pagePath ?? null,
    });
  }

  private requireGraph(): CompiledAgentGraph {
    if (!this.graph) {
      throw new Error('LangGraph ещё не инициализирован');
    }
    return this.graph;
  }

  private requireMessages(): typeof import('@langchain/core/messages') {
    if (!this.messagesMod) {
      throw new Error('LangChain messages ещё не загружены');
    }
    return this.messagesMod;
  }

  private readInt(key: string): number {
    const value = this.config.get<number | string>(key);
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`Не задан ${key}`);
    }
    return parsed;
  }
}

function toRunTurnResult(
  state: AgentState & { __interrupt__?: Array<{ value: unknown }> },
  threadId: string,
  fallback: {
    chunkIds: string[];
    temperature: number;
    pagePath: string | null;
  },
): RunTurnResult {
  const action = extractInterrupt(state);
  if (action) {
    return {
      interrupted: true,
      action,
      content: '',
      toolNames: state.toolNames ?? [],
      chunkIds: state.chunkIds ?? fallback.chunkIds,
      temperature: state.temperature ?? fallback.temperature,
      pagePath: state.pagePath ?? fallback.pagePath,
      promptTokens: state.promptTokens ?? 0,
      completionTokens: state.completionTokens ?? 0,
      assistantMessageId: threadId,
    };
  }

  return {
    interrupted: false,
    action: null,
    content: finalAssistantText(state),
    toolNames: state.toolNames ?? [],
    chunkIds: state.chunkIds ?? fallback.chunkIds,
    temperature: state.temperature ?? fallback.temperature,
    pagePath: state.pagePath ?? fallback.pagePath,
    promptTokens: state.promptTokens ?? 0,
    completionTokens: state.completionTokens ?? 0,
    assistantMessageId: threadId,
  };
}

function extractInterrupt(
  state: AgentState & { __interrupt__?: Array<{ value: unknown }> },
): InterruptActionPayload | null {
  const items = state.__interrupt__;
  if (!items?.length) {
    return null;
  }
  for (const item of items) {
    const action = readInterruptAction(item.value);
    if (action) {
      return action;
    }
  }
  return null;
}
