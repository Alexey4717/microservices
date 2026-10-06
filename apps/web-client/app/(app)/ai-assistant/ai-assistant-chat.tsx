'use client';

import { useEffect, useRef, useState } from 'react';

import {
  createAiConversation,
  getAiConversation,
  subscribeAiAssistantReply,
} from '@/lib/graphql/ai-assistant';
import type { AiConversation, AiMessage } from '@/lib/graphql/types';

type ChatLine = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type AiAssistantChatProps = {
  accessToken: string;
  initialConversations: AiConversation[];
  variant?: 'page' | 'panel';
};

export function AiAssistantChat({
  accessToken,
  initialConversations,
  variant = 'page',
}: AiAssistantChatProps) {
  const [conversations, setConversations] =
    useState<AiConversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  useEffect(
    () => () => {
      stopRef.current?.();
    },
    [],
  );

  async function openConversation(id: string) {
    setError(null);
    setActiveId(id);
    const detail = await getAiConversation({ id, accessToken });
    setMessages(visibleMessages(detail.messages));
    setConversations((current) =>
      current.map((item) =>
        item.id === detail.id ? { ...item, ...detail } : item,
      ),
    );
  }

  async function startConversation() {
    setError(null);
    const created = await createAiConversation({ accessToken });
    setConversations((current) => [created, ...current]);
    setActiveId(created.id);
    setMessages([]);
    return created.id;
  }

  async function sendMessage() {
    const content = draft.trim();
    if (!content || pending) {
      return;
    }

    setPending(true);
    setError(null);
    setDraft('');

    let conversationId = activeId;
    try {
      if (!conversationId) {
        conversationId = await startConversation();
      }
    } catch (sendError) {
      setPending(false);
      setDraft(content);
      setError(readError(sendError));
      return;
    }

    const userLine: ChatLine = {
      id: `local-${crypto.randomUUID()}`,
      role: 'user',
      content,
    };
    setMessages((current) => [...current, userLine]);
    setConversations((current) =>
      current.map((item) =>
        item.id === conversationId && !item.title
          ? { ...item, title: content.replace(/\s+/g, ' ').slice(0, 80) }
          : item,
      ),
    );

    stopRef.current?.();
    stopRef.current = subscribeAiAssistantReply({
      accessToken,
      conversationId,
      content,
      onReply: (event) => {
        if (!event.delta && !event.done) {
          return;
        }
        setMessages((current) =>
          appendDelta(current, event.messageId, event.delta),
        );
      },
      onError: (message) => {
        setError(message);
        setPending(false);
      },
      onComplete: () => {
        setPending(false);
        void getAiConversation({ id: conversationId, accessToken })
          .then((detail) => {
            setMessages(visibleMessages(detail.messages));
            setConversations((current) =>
              current.map((item) =>
                item.id === detail.id ? { ...item, title: detail.title } : item,
              ),
            );
          })
          .catch(() => undefined);
      },
    });
  }

  const conversationItems =
    conversations.length === 0 ? (
      <li className="px-2 py-3 text-sm text-zinc-500">Пока нет диалогов</li>
    ) : (
      conversations.map((conversation) => (
        <li key={conversation.id}>
          <button
            type="button"
            className={`w-full truncate rounded-lg px-2 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
              conversation.id === activeId
                ? 'bg-zinc-100 font-medium dark:bg-zinc-800'
                : ''
            }`}
            onClick={() => {
              void openConversation(conversation.id).catch(
                (openError: unknown) => {
                  setError(readError(openError));
                },
              );
            }}
          >
            {conversation.title?.trim() || 'Новый диалог'}
          </button>
        </li>
      ))
    );

  const transcript = (
    <div
      className={
        variant === 'panel'
          ? 'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3'
          : 'flex flex-1 flex-col gap-3 overflow-y-auto p-4'
      }
    >
      {messages.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Выберите диалог или напишите первое сообщение.
        </p>
      ) : (
        messages.map((message) => (
          <article
            key={message.id}
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
              message.role === 'user'
                ? 'ml-auto bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
            }`}
          >
            {message.content || (pending ? '…' : '')}
          </article>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );

  const errorLine = error ? (
    <p className="shrink-0 px-4 text-sm text-red-600 dark:text-red-400">
      {error}
    </p>
  ) : null;

  const composer = (
    <form
      className="flex shrink-0 gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
      onSubmit={(event) => {
        event.preventDefault();
        void sendMessage();
      }}
    >
      <textarea
        className={
          variant === 'panel'
            ? 'max-h-24 min-h-10 flex-1 resize-none rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:focus-visible:ring-zinc-100'
            : 'min-h-12 flex-1 resize-y rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:focus-visible:ring-zinc-100'
        }
        placeholder="Сообщение"
        value={draft}
        rows={2}
        disabled={pending}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void sendMessage();
          }
        }}
      />
      <button
        type="submit"
        className="self-end rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        disabled={pending || draft.trim().length === 0}
      >
        {pending ? 'Отправка…' : 'Отправить'}
      </button>
    </form>
  );

  const newConversationButton = (
    <button
      type="button"
      className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      disabled={pending}
      onClick={() => {
        void startConversation().catch((startError: unknown) => {
          setError(readError(startError));
        });
      }}
    >
      Новый диалог
    </button>
  );

  if (variant === 'panel') {
    return (
      <section className="flex h-full min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-col gap-2 border-b border-zinc-200 p-3 dark:border-zinc-800">
          {newConversationButton}
          <ul className="flex max-h-24 flex-col gap-1 overflow-y-auto">
            {conversationItems}
          </ul>
        </div>
        {transcript}
        {errorLine}
        {composer}
      </section>
    );
  }

  return (
    <section className="flex min-h-[70vh] flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight text-pretty">
        ИИ-ассистент
      </h1>
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          {newConversationButton}
          <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto md:max-h-[32rem]">
            {conversationItems}
          </ul>
        </aside>
        <div className="flex min-h-[24rem] flex-col rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {transcript}
          {errorLine}
          {composer}
        </div>
      </div>
    </section>
  );
}

function visibleMessages(messages: AiMessage[]): ChatLine[] {
  return messages.flatMap((message) => {
    if (message.role !== 'user' && message.role !== 'assistant') {
      return [];
    }
    if (message.content.includes('"type":"tool_calls"')) {
      return [];
    }
    return [
      {
        id: message.id,
        role: message.role,
        content: message.content,
      },
    ];
  });
}

function appendDelta(
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

function readError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Не удалось выполнить запрос';
}
