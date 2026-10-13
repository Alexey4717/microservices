import type { BaseMessage } from '@langchain/core/messages';

/** Состояние одного хода SendMessage / resume (thread_id = assistantMessageId). */
export interface AgentState {
  messages: BaseMessage[];
  toolRound: number;
  toolNames: string[];
  chunkIds: string[];
  assistantMessageId: string;
  temperature: number;
  pagePath: string | null;
  promptTokens: number;
  completionTokens: number;
}

export type AgentStateUpdate = Partial<{
  messages: BaseMessage[];
  toolRound: number;
  toolNames: string[];
  chunkIds: string[];
  assistantMessageId: string;
  temperature: number;
  pagePath: string | null;
  promptTokens: number;
  completionTokens: number;
}>;

export const MAX_TOOL_ROUNDS = 4;

export interface InterruptActionPayload {
  actionId: string;
  type: string;
  title: string;
}

export interface ResumeDecision {
  decision: 'confirmed' | 'rejected';
  checkoutUrl?: string;
  path?: string;
}
