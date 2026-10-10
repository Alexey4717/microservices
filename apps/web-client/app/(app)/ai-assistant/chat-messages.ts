import type { ChatLine, ConversationMessage } from './chat-model';

export function visibleMessages(messages: ConversationMessage[]): ChatLine[] {
  const lines: ChatLine[] = [];
  let tools: string[] = [];
  for (const message of messages) {
    if (message.role === 'tool') {
      if (message.toolName) {
        tools.push(message.toolName);
      }
      continue;
    }
    if (message.role !== 'user' && message.role !== 'assistant') {
      continue;
    }
    if (message.content.includes('"type":"tool_calls"')) {
      continue;
    }
    lines.push({
      id: message.id,
      role: message.role,
      content: message.content,
      tools:
        message.role === 'assistant' && tools.length > 0 ? tools : undefined,
    });
    tools = [];
  }
  return lines;
}

export function appendDelta(
  messages: ChatLine[],
  messageId: string,
  delta: string,
): ChatLine[] {
  const index = messages.findIndex((message) => message.id === messageId);
  if (index === -1) {
    if (!delta) {
      return messages;
    }
    return [...messages, { id: messageId, role: 'assistant', content: delta }];
  }
  if (!delta) {
    return messages;
  }
  const next = messages.slice();
  const current = next[index];
  next[index] = { ...current, content: current.content + delta };
  return next;
}

export function appendTool(
  messages: ChatLine[],
  messageId: string,
  toolName: string,
): ChatLine[] {
  const index = messages.findIndex((message) => message.id === messageId);
  if (index === -1) {
    return [
      ...messages,
      { id: messageId, role: 'assistant', content: '', tools: [toolName] },
    ];
  }
  const current = messages[index];
  const tools = current.tools ?? [];
  if (tools[tools.length - 1] === toolName) {
    return messages;
  }
  const next = messages.slice();
  next[index] = { ...current, tools: [...tools, toolName] };
  return next;
}
