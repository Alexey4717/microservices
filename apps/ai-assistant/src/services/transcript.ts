import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

import type { BudgetMessage } from './token-budget.service';

const TITLE_MAX = 80;

export interface StoredToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface StoredMessage {
  role: string;
  content: string;
  toolName?: string | null;
}

export function titleFromUserMessage(content: string): string {
  const collapsed = content.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= TITLE_MAX) {
    return collapsed;
  }
  return `${collapsed.slice(0, TITLE_MAX - 1).trimEnd()}…`;
}

export function encodeToolCalls(calls: StoredToolCall[]): string {
  return JSON.stringify({ type: 'tool_calls', calls });
}

export function decodeToolCalls(content: string): StoredToolCall[] | null {
  if (!content.startsWith('{"type":"tool_calls"')) {
    return null;
  }

  try {
    const parsed = JSON.parse(content) as {
      type?: string;
      calls?: StoredToolCall[];
    };
    if (parsed.type !== 'tool_calls' || !Array.isArray(parsed.calls)) {
      return null;
    }
    return parsed.calls.filter(
      (call) =>
        typeof call?.id === 'string' &&
        typeof call?.name === 'string' &&
        typeof call?.arguments === 'string',
    );
  } catch {
    return null;
  }
}

export function encodeToolResult(toolCallId: string, result: string): string {
  return JSON.stringify({ toolCallId, result });
}

export function decodeToolResult(
  content: string,
): { toolCallId: string; result: string } | null {
  try {
    const parsed = JSON.parse(content) as {
      toolCallId?: unknown;
      result?: unknown;
    };
    if (
      typeof parsed.toolCallId !== 'string' ||
      typeof parsed.result !== 'string'
    ) {
      return null;
    }
    return { toolCallId: parsed.toolCallId, result: parsed.result };
  } catch {
    return null;
  }
}

export function toBudgetMessages(rows: StoredMessage[]): BudgetMessage[] {
  return rows.map((row) => ({
    role:
      row.role === 'assistant' || row.role === 'tool' || row.role === 'system'
        ? row.role
        : 'user',
    content: row.content,
  }));
}

export function toLlmMessages(
  rows: StoredMessage[],
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [];

  for (const row of rows) {
    if (row.role === 'user') {
      messages.push({ role: 'user', content: row.content });
      continue;
    }

    if (row.role === 'assistant') {
      const calls = decodeToolCalls(row.content);
      if (calls) {
        messages.push({
          role: 'assistant',
          content: null,
          tool_calls: calls.map((call) => ({
            id: call.id,
            type: 'function' as const,
            function: { name: call.name, arguments: call.arguments },
          })),
        });
      } else {
        messages.push({ role: 'assistant', content: row.content });
      }
      continue;
    }

    if (row.role === 'tool') {
      const parsed = decodeToolResult(row.content);
      messages.push({
        role: 'tool',
        tool_call_id: parsed?.toolCallId ?? 'tool',
        content: parsed?.result ?? row.content,
      });
    }
  }

  return messages;
}
