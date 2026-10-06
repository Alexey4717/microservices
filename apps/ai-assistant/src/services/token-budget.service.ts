import { Injectable } from '@nestjs/common';

export type BudgetRole = 'system' | 'user' | 'assistant' | 'tool';

export interface BudgetMessage {
  role: BudgetRole;
  content: string;
}

export interface FitHistoryInput {
  systemPrompt: string;
  toolSchemaText: string;
  retrievalText: string;
  history: BudgetMessage[];
  contextTokens: number;
  maxOutputTokens: number;
}

export interface FitHistoryResult {
  messages: BudgetMessage[];
  droppedCount: number;
  overflow: boolean;
}

interface HistoryGroup {
  messages: BudgetMessage[];
  tokens: number;
}

export function estimateTokens(text: string): number {
  if (!text) {
    return 0;
  }
  return Math.ceil(text.length / 4);
}

export function utcDay(now = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

export function isOverDailyTokenLimit(
  usedTokens: number,
  limit: number,
): boolean {
  if (!Number.isFinite(limit) || limit <= 0) {
    return false;
  }
  return usedTokens >= limit;
}

export function fitPrompt(input: FitHistoryInput): FitHistoryResult {
  const inputBudget = Math.max(0, input.contextTokens - input.maxOutputTokens);
  const systemMessage: BudgetMessage = {
    role: 'system',
    content: input.systemPrompt,
  };
  const retrievalMessage: BudgetMessage | null = input.retrievalText
    ? { role: 'system', content: input.retrievalText }
    : null;
  const reserved =
    estimateTokens(input.systemPrompt) +
    estimateTokens(input.toolSchemaText) +
    estimateTokens(input.retrievalText);
  const prefix = retrievalMessage
    ? [systemMessage, retrievalMessage]
    : [systemMessage];

  if (reserved > inputBudget) {
    return {
      messages: prefix,
      droppedCount: input.history.length,
      overflow: true,
    };
  }

  const groups = groupHistory(input.history);
  let available = inputBudget - reserved;
  const keptGroups: HistoryGroup[] = [];

  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index];
    if (group.tokens > available) {
      if (index === groups.length - 1) {
        return {
          messages: prefix,
          droppedCount: input.history.length,
          overflow: true,
        };
      }
      break;
    }
    keptGroups.push(group);
    available -= group.tokens;
  }

  keptGroups.reverse();
  const kept = keptGroups.flatMap((group) => group.messages);
  return {
    messages: [...prefix, ...kept],
    droppedCount: input.history.length - kept.length,
    overflow: false,
  };
}

function groupHistory(messages: BudgetMessage[]): HistoryGroup[] {
  const groups: HistoryGroup[] = [];
  let current: BudgetMessage[] = [];

  const flush = () => {
    if (current.length === 0) {
      return;
    }
    groups.push({
      messages: current,
      tokens: current.reduce(
        (sum, message) => sum + estimateTokens(message.content),
        0,
      ),
    });
    current = [];
  };

  for (const message of messages) {
    if (message.role === 'user' && current.length > 0) {
      flush();
    }
    current.push(message);
  }
  flush();
  return groups;
}

@Injectable()
export class TokenBudgetService {
  fit(input: FitHistoryInput): FitHistoryResult {
    return fitPrompt(input);
  }

  isDailyLimitExceeded(usedTokens: number, limit: number): boolean {
    return isOverDailyTokenLimit(usedTokens, limit);
  }
}
