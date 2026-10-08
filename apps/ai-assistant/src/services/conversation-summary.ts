import { estimateTokens } from './token-budget.service';

export const SUMMARY_INSTRUCTION = `Сожми фрагмент диалога в несколько предложений на русском.
Сохрани факты, которые сообщил пользователь, и раздели предложенные действия и уже подтверждённые.
Не выдумывай. Не отвечай пользователю: верни только обновлённую сводку.
Если дана предыдущая сводка, сохрани её факты и дополни новым фрагментом.`;

export const SUMMARY_INPUT_TOKENS = 1500;

export interface SummaryMessage {
  id?: string;
  role: string;
  content: string;
}

export function selectUncoveredMessages(
  ordered: SummaryMessage[],
  droppedCount: number,
  coveredUntilId: string | null | undefined,
): SummaryMessage[] {
  const dropped = ordered.slice(0, Math.max(0, droppedCount));
  const withIds = dropped.filter((message) => Boolean(message.id));
  if (!coveredUntilId) {
    return withIds;
  }

  const coveredIndex = ordered.findIndex(
    (message) => message.id === coveredUntilId,
  );
  if (coveredIndex === -1) {
    return withIds;
  }

  return dropped.filter(
    (message, index) => Boolean(message.id) && index > coveredIndex,
  );
}

export function takeSummaryPrefix(
  messages: SummaryMessage[],
  maxTokens: number,
): SummaryMessage[] {
  const selected: SummaryMessage[] = [];
  let tokens = 0;
  for (const message of messages) {
    const cost = estimateTokens(message.content) + 8;
    if (selected.length > 0 && tokens + cost > maxTokens) {
      break;
    }
    selected.push(message);
    tokens += cost;
  }
  return selected;
}

export function formatSummaryRequest(
  previousSummary: string | null | undefined,
  messages: SummaryMessage[],
): string {
  const previous = previousSummary?.trim();
  const transcript = messages
    .map((message) => `${message.role}: ${compactContent(message.content)}`)
    .join('\n');
  if (!previous) {
    return transcript;
  }
  return `Предыдущая сводка:\n${previous.slice(0, 4000)}\n\nНовый фрагмент:\n${transcript}`;
}

function compactContent(content: string): string {
  if (content.startsWith('{"type":"tool_calls"')) {
    return 'вызов инструментов';
  }
  return content.slice(0, 1000);
}
