import { MessageRole } from '@prisma/ai-assistant-client';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import type {
  AgentState,
  AgentStateUpdate,
  InterruptActionPayload,
  ResumeDecision,
} from './agent-state';
import { MAX_TOOL_ROUNDS } from './agent-state';
import type { PrismaService } from './prisma.service';
import { estimateTokens } from './token-budget.service';
import type { ToolRegistry } from './tool-registry';
import {
  PROPOSE_CHECKOUT_TOOL,
  PROPOSE_NAVIGATION_TOOL,
  PROPOSE_UPDATE_NAME_TOOL,
} from './tool-definitions';
import type { ActionProposal, ToolSession } from './tool-types';
import { encodeToolCalls, encodeToolResult } from './transcript';

export interface AgentChatModel {
  bindTools(tools: unknown[]): AgentChatModel;
  stream(
    messages: unknown[],
    options?: { signal?: AbortSignal },
  ): AsyncIterable<{
    content?: unknown;
    tool_call_chunks?: Array<{
      index?: number;
      id?: string;
      name?: string;
      args?: string;
    }>;
    usage_metadata?: { input_tokens?: number; output_tokens?: number };
  }>;
}

export interface AgentGraphDeps {
  tools: ToolRegistry;
  prisma: PrismaService;
  llm: {
    baseURL: string;
    apiKey: string;
    model: string;
    maxOutputTokens: number;
  };
  /** Шов для юнит-тестов без реального LLM. */
  createChatModel?: (temperature: number) => AgentChatModel;
}

export interface AgentGraphRuntime {
  session: ToolSession;
  onTextDelta?: (delta: string) => void;
  onToolName?: (toolName: string) => void;
  onAction?: (action: ActionProposal) => void;
  signal?: AbortSignal;
}

export interface GraphRunConfig {
  configurable: { thread_id: string; runtime: AgentGraphRuntime };
  signal?: AbortSignal;
}

export interface CompiledAgentGraph {
  invokeTurn(
    input: AgentState | { resume: ResumeDecision },
    config: GraphRunConfig,
  ): Promise<AgentState & { __interrupt__?: Array<{ value: unknown }> }>;
}

const PROPOSE_TOOLS = new Set([
  PROPOSE_CHECKOUT_TOOL.name,
  PROPOSE_NAVIGATION_TOOL.name,
  PROPOSE_UPDATE_NAME_TOOL.name,
]);

type LangGraphModule = typeof import('@langchain/langgraph');
type LangChainMessages = typeof import('@langchain/core/messages');
type LangChainOpenAI = typeof import('@langchain/openai');
type LangChainCoreMessages = import('@langchain/core/messages').BaseMessage;

export async function loadLangGraphModules(): Promise<{
  langgraph: LangGraphModule;
  messages: LangChainMessages;
  openai: LangChainOpenAI;
}> {
  const [langgraph, messages, openai] = await Promise.all([
    import('@langchain/langgraph'),
    import('@langchain/core/messages'),
    import('@langchain/openai'),
  ]);
  return { langgraph, messages, openai };
}

export function createAgentStateAnnotation(Annotation: LangGraphModule['Annotation']) {
  return Annotation.Root({
    messages: Annotation<LangChainCoreMessages[]>({
      reducer: (left, right) => left.concat(right),
      default: () => [],
    }),
    toolRound: Annotation<number>({
      reducer: (_left, right) => right,
      default: () => 0,
    }),
    toolNames: Annotation<string[]>({
      reducer: (left, right) => left.concat(right),
      default: () => [],
    }),
    chunkIds: Annotation<string[]>({
      reducer: (_left, right) => right,
      default: () => [],
    }),
    assistantMessageId: Annotation<string>({
      reducer: (_left, right) => right,
      default: () => '',
    }),
    temperature: Annotation<number>({
      reducer: (_left, right) => right,
      default: () => 0.2,
    }),
    pagePath: Annotation<string | null>({
      reducer: (_left, right) => right,
      default: () => null,
    }),
    promptTokens: Annotation<number>({
      reducer: (left, right) => left + right,
      default: () => 0,
    }),
    completionTokens: Annotation<number>({
      reducer: (left, right) => left + right,
      default: () => 0,
    }),
  });
}

export async function buildAgentGraph(
  deps: AgentGraphDeps,
  checkpointer: unknown,
): Promise<CompiledAgentGraph> {
  const { langgraph, messages, openai } = await loadLangGraphModules();
  const { StateGraph, START, END, interrupt } = langgraph;
  const { AIMessage, ToolMessage, isAIMessage } = messages;
  const { ChatOpenAI } = openai;
  const stateAnnotation = createAgentStateAnnotation(langgraph.Annotation);

  const openAiTools = deps.tools.openAiTools();

  async function agentNode(
    state: AgentState,
    config: { configurable?: { runtime?: AgentGraphRuntime } },
  ): Promise<AgentStateUpdate> {
    const runtime = config.configurable?.runtime;
    if (runtime?.signal?.aborted) {
      return {};
    }

    const model =
      deps.createChatModel?.(state.temperature) ??
      new ChatOpenAI({
        model: deps.llm.model,
        apiKey: deps.llm.apiKey,
        configuration: { baseURL: deps.llm.baseURL },
        maxTokens: deps.llm.maxOutputTokens,
        streaming: true,
        temperature: state.temperature,
      });

    const allowTools = state.toolRound < MAX_TOOL_ROUNDS;
    const bound =
      allowTools && openAiTools.length > 0
        ? model.bindTools(openAiTools)
        : model;

    const stream = await bound.stream(state.messages, {
      signal: runtime?.signal,
    });

    let content = '';
    let streamedText = false;
    let sawToolCall = false;
    const toolCallChunks: Array<{
      id?: string;
      name?: string;
      args?: string;
      index?: number;
    }> = [];
    let promptTokens = 0;
    let completionTokens = 0;

    for await (const chunk of stream) {
      if (runtime?.signal?.aborted) {
        break;
      }
      const usage = chunk.usage_metadata;
      if (usage) {
        promptTokens = usage.input_tokens ?? promptTokens;
        completionTokens = usage.output_tokens ?? completionTokens;
      }
      if (chunk.tool_call_chunks?.length) {
        sawToolCall = true;
        for (const part of chunk.tool_call_chunks) {
          const index = part.index ?? 0;
          const current = toolCallChunks[index] ?? { index };
          if (part.id) {
            current.id = part.id;
          }
          if (part.name) {
            current.name = (current.name ?? '') + part.name;
          }
          if (typeof part.args === 'string') {
            current.args = (current.args ?? '') + part.args;
          }
          toolCallChunks[index] = current;
        }
      }
      const text = messageText(chunk.content);
      if (text && !sawToolCall) {
        content += text;
        runtime?.onTextDelta?.(text);
        streamedText = true;
      }
    }

    const toolCalls = toolCallChunks
      .filter((call) => call.name)
      .map((call, index) => ({
        id: call.id || `call_${index}`,
        name: call.name as string,
        args: parseToolArgs(call.args ?? ''),
        type: 'tool_call' as const,
      }));

    if (promptTokens <= 0) {
      promptTokens = estimateTokens(JSON.stringify(state.messages));
    }
    if (completionTokens <= 0) {
      completionTokens = estimateTokens(
        `${content}${JSON.stringify(toolCalls)}`,
      );
    }

    if (toolCalls.length > 0 && allowTools) {
      const stored = toolCalls.map((call) => ({
        id: call.id,
        name: call.name,
        arguments: JSON.stringify(call.args ?? {}),
      }));
      const conversationId = runtime?.session.conversationId;
      if (conversationId) {
        await deps.prisma.message.create({
          data: {
            conversationId,
            role: MessageRole.assistant,
            content: encodeToolCalls(stored),
            promptTokens,
            completionTokens,
          },
        });
      }
      return {
        messages: [
          new AIMessage({
            content: '',
            tool_calls: toolCalls,
          }),
        ],
        promptTokens,
        completionTokens,
      };
    }

    const answer = sawToolCall ? '' : content;
    if (!streamedText && answer) {
      runtime?.onTextDelta?.(answer);
    }

    return {
      messages: [new AIMessage(answer)],
      promptTokens,
      completionTokens,
    };
  }

  async function toolsNode(
    state: AgentState,
    config: { configurable?: { runtime?: AgentGraphRuntime } },
  ): Promise<AgentStateUpdate> {
    const runtime = config.configurable?.runtime;
    if (!runtime?.session.conversationId) {
      return { toolRound: state.toolRound + 1 };
    }

    const last = state.messages[state.messages.length - 1];
    if (!last || !isAIMessage(last) || !last.tool_calls?.length) {
      return { toolRound: state.toolRound + 1 };
    }

    const conversationId = runtime.session.conversationId;
    const session: ToolSession = {
      ...runtime.session,
      conversationId,
      threadId: state.assistantMessageId || runtime.session.threadId,
    };

    const toolMessages: InstanceType<typeof ToolMessage>[] = [];
    const toolNames: string[] = [];
    let interruptPayload: InterruptActionPayload | null = null;

    for (const call of last.tool_calls) {
      const toolCallId = call.id ?? `call_${toolMessages.length}`;
      const existing = state.messages.find(
        (message) =>
          isToolMessage(message) && message.tool_call_id === toolCallId,
      );
      if (existing && isToolMessage(existing)) {
        toolMessages.push(
          new ToolMessage({
            content: messageText(existing.content),
            tool_call_id: toolCallId,
            name: call.name,
          }),
        );
        toolNames.push(call.name);
        if (PROPOSE_TOOLS.has(call.name)) {
          const action = await findPendingActionForThread(
            deps.prisma,
            session,
          );
          if (action) {
            interruptPayload = action;
          }
        }
        continue;
      }

      const alreadyStored = await findStoredToolResult(
        deps.prisma,
        conversationId,
        toolCallId,
      );
      if (alreadyStored) {
        const message = new ToolMessage({
          content: alreadyStored,
          tool_call_id: toolCallId,
          name: call.name,
        });
        toolMessages.push(message);
        toolNames.push(call.name);
        if (PROPOSE_TOOLS.has(call.name)) {
          const action = await findPendingActionForThread(
            deps.prisma,
            session,
          );
          if (action) {
            interruptPayload = action;
            runtime.onAction?.({
              id: action.actionId,
              type: action.type,
              title: action.title,
            });
          }
        }
        continue;
      }

      const outcome = await deps.tools.execute(call.name, call.args, session);
      toolNames.push(call.name);
      runtime.onToolName?.(call.name);

      const content = outcome.content;
      if (outcome.action) {
        runtime.onAction?.(outcome.action);
        interruptPayload = {
          actionId: outcome.action.id,
          type: outcome.action.type,
          title: outcome.action.title,
        };
      }

      await deps.prisma.message.create({
        data: {
          conversationId,
          role: MessageRole.tool,
          content: encodeToolResult(toolCallId, content),
          toolName: call.name,
        },
      });

      toolMessages.push(
        new ToolMessage({
          content,
          tool_call_id: toolCallId,
          name: call.name,
        }),
      );
    }

    if (interruptPayload) {
      const decision = toResumeDecision(interrupt(interruptPayload));
      for (let index = 0; index < toolMessages.length; index += 1) {
        const message = toolMessages[index];
        if (!message.name || !PROPOSE_TOOLS.has(message.name)) {
          continue;
        }
        const suffix = formatResumeNote(decision);
        toolMessages[index] = new ToolMessage({
          content: `${messageText(message.content)}\n${suffix}`,
          tool_call_id: message.tool_call_id,
          name: message.name,
        });
      }
    }

    return {
      messages: toolMessages,
      toolNames,
      toolRound: state.toolRound + 1,
    };
  }

  function routeAfterAgent(state: AgentState): 'tools' | typeof END {
    const last = state.messages[state.messages.length - 1];
    if (
      last &&
      isAIMessage(last) &&
      last.tool_calls?.length &&
      state.toolRound < MAX_TOOL_ROUNDS
    ) {
      return 'tools';
    }
    return END;
  }

  const graph = new StateGraph(stateAnnotation)
    .addNode('agent', agentNode)
    .addNode('tools', toolsNode)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', routeAfterAgent, {
      tools: 'tools',
      [END]: END,
    })
    .addEdge('tools', 'agent')
    .compile({ checkpointer: checkpointer as never });

  return {
    async invokeTurn(input, config) {
      if ('resume' in input) {
        const command: unknown = new langgraph.Command({
          resume: input.resume,
        });
        return toTurnResult(
          await graph.invoke(
            command as Parameters<typeof graph.invoke>[0],
            config,
          ),
        );
      }
      return toTurnResult(await graph.invoke(input, config));
    },
  };
}

function toTurnResult(
  value: unknown,
): AgentState & { __interrupt__?: Array<{ value: unknown }> } {
  return value as AgentState & {
    __interrupt__?: Array<{ value: unknown }>;
  };
}

export function llmMessagesToLangChain(
  rows: ChatCompletionMessageParam[],
  messages: LangChainMessages,
): LangChainCoreMessages[] {
  const { AIMessage, HumanMessage, SystemMessage, ToolMessage } = messages;
  const result: LangChainCoreMessages[] = [];
  for (const row of rows) {
    if (row.role === 'system') {
      result.push(new SystemMessage(chatContentText(row.content)));
      continue;
    }
    if (row.role === 'user') {
      result.push(new HumanMessage(chatContentText(row.content)));
      continue;
    }
    if (row.role === 'assistant') {
      const toolCalls =
        'tool_calls' in row && Array.isArray(row.tool_calls)
          ? row.tool_calls.flatMap((call) => {
              if (!call || call.type !== 'function') {
                return [];
              }
              return [
                {
                  id: call.id,
                  name: call.function.name,
                  args: parseToolArgs(call.function.arguments ?? ''),
                  type: 'tool_call' as const,
                },
              ];
            })
          : [];
      if (toolCalls.length > 0) {
        result.push(
          new AIMessage({
            content: chatContentText(row.content),
            tool_calls: toolCalls,
          }),
        );
      } else {
        result.push(new AIMessage(chatContentText(row.content)));
      }
      continue;
    }
    if (row.role === 'tool') {
      result.push(
        new ToolMessage({
          content: chatContentText(row.content),
          tool_call_id: row.tool_call_id,
        }),
      );
    }
  }
  return result;
}

export function finalAssistantText(state: AgentState): string {
  for (let index = state.messages.length - 1; index >= 0; index -= 1) {
    const message = state.messages[index];
    if (
      message._getType() === 'ai' &&
      !(
        'tool_calls' in message &&
        Array.isArray(message.tool_calls) &&
        message.tool_calls.length > 0
      )
    ) {
      return messageText(message.content);
    }
  }
  return '';
}

export function readInterruptAction(
  value: unknown,
): InterruptActionPayload | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.actionId !== 'string' ||
    typeof record.type !== 'string' ||
    typeof record.title !== 'string'
  ) {
    return null;
  }
  return {
    actionId: record.actionId,
    type: record.type,
    title: record.title,
  };
}

function isToolMessage(
  message: LangChainCoreMessages,
): message is LangChainCoreMessages & {
  tool_call_id: string;
  name?: string;
  content: unknown;
} {
  return message._getType() === 'tool' && 'tool_call_id' in message;
}

function chatContentText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (content == null) {
    return '';
  }
  if (Array.isArray(content)) {
    return messageText(content);
  }
  return '';
}

function messageText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (!Array.isArray(content)) {
    return '';
  }
  return content
    .map((part) => {
      if (typeof part === 'string') {
        return part;
      }
      if (!part || typeof part !== 'object') {
        return '';
      }
      const record = part as { type?: unknown; text?: unknown };
      if (record.type === 'text' && typeof record.text === 'string') {
        return record.text;
      }
      return '';
    })
    .join('');
}

function parseToolArgs(raw: string): Record<string, unknown> {
  if (!raw.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function toResumeDecision(value: unknown): ResumeDecision {
  if (!value || typeof value !== 'object') {
    return { decision: 'rejected' };
  }
  const record = value as Record<string, unknown>;
  if (record.decision === 'confirmed' || record.decision === 'rejected') {
    return {
      decision: record.decision,
      checkoutUrl:
        typeof record.checkoutUrl === 'string' ? record.checkoutUrl : undefined,
      path: typeof record.path === 'string' ? record.path : undefined,
    };
  }
  return { decision: 'rejected' };
}

function formatResumeNote(decision: ResumeDecision): string {
  if (decision.decision === 'rejected') {
    return 'Пользователь отклонил действие. Продолжи ответ с учётом отказа.';
  }
  const extras: string[] = ['Пользователь подтвердил действие.'];
  if (decision.checkoutUrl) {
    extras.push(`checkoutUrl=${decision.checkoutUrl}`);
  }
  if (decision.path) {
    extras.push(`path=${decision.path}`);
  }
  extras.push('Продолжи ответ с учётом подтверждения.');
  return extras.join(' ');
}

async function findStoredToolResult(
  prisma: PrismaService,
  conversationId: string,
  toolCallId: string,
): Promise<string | null> {
  const rows = await prisma.message.findMany({
    where: { conversationId, role: MessageRole.tool },
    orderBy: { createdAt: 'desc' },
    take: 40,
  });
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.content) as {
        toolCallId?: string;
        result?: string;
      };
      if (parsed.toolCallId === toolCallId && typeof parsed.result === 'string') {
        return parsed.result;
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function findPendingActionForThread(
  prisma: PrismaService,
  session: ToolSession,
): Promise<InterruptActionPayload | null> {
  const threadId = session.threadId?.trim();
  if (!threadId || !session.conversationId) {
    return null;
  }
  // Без фильтра status: на resume строка уже confirmed/rejected,
  // но interrupt() всё равно нужно вызвать, чтобы получить Command.resume.
  const action = await prisma.pendingAction.findFirst({
    where: {
      conversationId: session.conversationId,
      userId: session.userId,
      threadId,
    },
    orderBy: { createdAt: 'asc' },
  });
  if (!action) {
    return null;
  }
  const payload = action.payload as { title?: unknown };
  const title =
    typeof payload.title === 'string' && payload.title.trim()
      ? payload.title
      : action.type;
  return { actionId: action.id, type: action.type, title };
}
