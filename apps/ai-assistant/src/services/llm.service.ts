import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import OpenAI from 'openai';
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';

import { estimateTokens } from './token-budget.service';
import type { StoredToolCall } from './transcript';

type OllamaStreamingParams = ChatCompletionCreateParamsStreaming & {
  options?: {
    num_ctx?: number;
  };
};

type ToolCallDelta = NonNullable<
  ChatCompletionChunk.Choice.Delta['tool_calls']
>[number];

interface PendingToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface LlmTurnRequest {
  messages: ChatCompletionMessageParam[];
  tools: ChatCompletionTool[];
  signal?: AbortSignal;
  onTextDelta?: (delta: string) => void;
}

export interface LlmTurn {
  content: string;
  toolCalls: StoredToolCall[];
  promptTokens: number;
  completionTokens: number;
  streamedText: boolean;
}

@Injectable()
export class LlmService {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly contextTokens: number;
  private readonly maxOutputTokens: number;

  constructor(configService: ConfigService) {
    this.client = new OpenAI({
      baseURL: configService.getOrThrow<string>('LLM_BASE_URL'),
      apiKey: configService.getOrThrow<string>('LLM_API_KEY'),
    });
    this.model = configService.getOrThrow<string>('LLM_MODEL');
    this.contextTokens = readPositiveInt(configService, 'LLM_CONTEXT_TOKENS');
    this.maxOutputTokens = readPositiveInt(
      configService,
      'LLM_MAX_OUTPUT_TOKENS',
    );
  }

  async createTurn(request: LlmTurnRequest): Promise<LlmTurn> {
    const params: OllamaStreamingParams = {
      model: this.model,
      messages: request.messages,
      stream: true,
      stream_options: { include_usage: true },
      max_tokens: this.maxOutputTokens,
      options: { num_ctx: this.contextTokens },
    };
    if (request.tools.length > 0) {
      params.tools = request.tools;
    }

    const stream = await this.client.chat.completions.create(params, {
      signal: request.signal,
    });

    let content = '';
    let streamedText = false;
    let sawToolCall = false;
    const pending = new Map<number, PendingToolCall>();
    let promptTokens = 0;
    let completionTokens = 0;

    for await (const chunk of stream) {
      if (chunk.usage) {
        promptTokens = chunk.usage.prompt_tokens ?? promptTokens;
        completionTokens = chunk.usage.completion_tokens ?? completionTokens;
      }

      const delta = chunk.choices[0]?.delta;
      if (!delta) {
        continue;
      }

      if (delta.tool_calls?.length) {
        sawToolCall = true;
        absorbToolCallDeltas(pending, delta.tool_calls);
      }

      if (delta.content) {
        content += delta.content;
        if (!sawToolCall && request.onTextDelta) {
          request.onTextDelta(delta.content);
          streamedText = true;
        }
      }
    }

    const toolCalls = [...pending.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([, call]) => call)
      .filter((call) => call.name.length > 0);

    if (promptTokens <= 0) {
      promptTokens = estimateTokens(JSON.stringify(request.messages));
    }
    if (completionTokens <= 0) {
      completionTokens = estimateTokens(
        `${content}${JSON.stringify(toolCalls)}`,
      );
    }

    return {
      content: sawToolCall ? '' : content,
      toolCalls,
      promptTokens,
      completionTokens,
      streamedText: sawToolCall ? false : streamedText,
    };
  }
}

function absorbToolCallDeltas(
  pending: Map<number, PendingToolCall>,
  deltas: ToolCallDelta[],
): void {
  for (const delta of deltas) {
    const current = pending.get(delta.index) ?? {
      id: '',
      name: '',
      arguments: '',
    };
    if (delta.id) {
      current.id = delta.id;
    }
    if (delta.function?.name) {
      current.name += delta.function.name;
    }
    if (delta.function?.arguments) {
      current.arguments += delta.function.arguments;
    }
    if (!current.id) {
      current.id = `call_${delta.index}`;
    }
    pending.set(delta.index, current);
  }
}

function readPositiveInt(configService: ConfigService, key: string): number {
  const value = configService.get<number | string>(key);
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Не задан ${key}`);
  }
  return parsed;
}
