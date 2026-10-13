import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';

import {
  buildAgentGraph,
  finalAssistantText,
  readInterruptAction,
  type AgentChatModel,
} from './agent-graph';

describe('agent-graph interrupt/resume', () => {
  it('propose → interrupt → resume confirmed → финальный текст', async () => {
    const messageCreate = vi.fn().mockResolvedValue({});
    const findMany = vi.fn().mockResolvedValue([]);
    const findFirst = vi.fn().mockResolvedValue({
      id: 'action-1',
      type: 'navigate',
      payload: { title: 'Перейти в профиль', path: '/profile' },
      status: 'pending',
    });

    const prisma = {
      message: { create: messageCreate, findMany },
      pendingAction: { findFirst },
    };

    const execute = vi.fn().mockResolvedValue({
      content: 'Предложение перехода создано. id=action-1',
      action: {
        id: 'action-1',
        type: 'navigate',
        title: 'Перейти в профиль',
      },
    });

    const tools = {
      openAiTools: () => [
        {
          type: 'function' as const,
          function: {
            name: 'propose_navigation',
            description: 'nav',
            parameters: { type: 'object', properties: {} },
          },
        },
      ],
      execute,
    };

    let round = 0;
    const createChatModel = (): AgentChatModel => ({
      bindTools() {
        return this;
      },
      stream() {
        round += 1;
        const chunk =
          round === 1
            ? {
                content: '',
                tool_call_chunks: [
                  {
                    index: 0,
                    id: 'call_1',
                    name: 'propose_navigation',
                    args: '{"path":"/profile"}',
                  },
                ],
                usage_metadata: { input_tokens: 10, output_tokens: 5 },
              }
            : {
                content: 'Отлично, переход подтверждён.',
                tool_call_chunks: [],
                usage_metadata: { input_tokens: 12, output_tokens: 8 },
              };
        return {
          [Symbol.asyncIterator]() {
            let done = false;
            return {
              next() {
                if (done) {
                  return Promise.resolve({
                    done: true as const,
                    value: undefined,
                  });
                }
                done = true;
                return Promise.resolve({ done: false as const, value: chunk });
              },
            };
          },
        };
      },
    });

    const graph = await buildAgentGraph(
      {
        tools: tools as never,
        prisma: prisma as never,
        llm: {
          baseURL: 'http://127.0.0.1:11434/v1',
          apiKey: 'ollama',
          model: 'test',
          maxOutputTokens: 256,
        },
        createChatModel,
      },
      new MemorySaver(),
    );

    const threadId = 'assistant-msg-1';
    const runtime = {
      session: {
        userId: 'user-1',
        conversationId: 'conv-1',
        internalToken: 'token',
        threadId,
      },
    };

    const interrupted = await graph.invokeTurn(
      {
        messages: [new HumanMessage('открой профиль')],
        toolRound: 0,
        toolNames: [],
        chunkIds: [],
        assistantMessageId: threadId,
        temperature: 0.2,
        pagePath: '/ai-assistant',
        promptTokens: 0,
        completionTokens: 0,
      },
      { configurable: { thread_id: threadId, runtime } },
    );

    expect(interrupted.__interrupt__?.length).toBeGreaterThan(0);
    const payload = readInterruptAction(interrupted.__interrupt__?.[0]?.value);
    expect(payload).toEqual({
      actionId: 'action-1',
      type: 'navigate',
      title: 'Перейти в профиль',
    });
    expect(execute).toHaveBeenCalledTimes(1);

    findMany.mockResolvedValue([
      {
        content: JSON.stringify({
          toolCallId: 'call_1',
          result: 'Предложение перехода создано. id=action-1',
        }),
      },
    ]);

    const resumed = await graph.invokeTurn(
      {
        resume: { decision: 'confirmed', path: '/profile' },
      },
      { configurable: { thread_id: threadId, runtime } },
    );

    expect(resumed.__interrupt__).toBeUndefined();
    expect(finalAssistantText(resumed)).toContain('подтвержд');
    expect(execute).toHaveBeenCalledTimes(1);
    expect(
      resumed.messages.some((message) => message instanceof ToolMessage),
    ).toBe(true);
    expect(
      resumed.messages.some((message) => message instanceof AIMessage),
    ).toBe(true);
  });
});
