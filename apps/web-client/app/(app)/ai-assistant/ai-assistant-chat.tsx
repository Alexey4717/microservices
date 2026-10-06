'use client';

import {
  useLazyQuery,
  useMutation,
  useSubscription,
} from '@apollo/client/react';
import { useEffect, useRef, useState } from 'react';

import { AiAssistantReplyDocument } from '@libs/graphql/operations/ai-assistant/ai-assistant-reply.generated';
import {
  AiConversationDocument,
  type AiConversationQuery,
} from '@libs/graphql/operations/ai-assistant/ai-conversation.generated';
import type { AiConversationsQuery } from '@libs/graphql/operations/ai-assistant/ai-conversations.generated';
import { CreateAiConversationDocument } from '@libs/graphql/operations/ai-assistant/create-ai-conversation.generated';

type ConversationItem = AiConversationsQuery['aiConversations'][number];
type ConversationMessage =
  AiConversationQuery['aiConversation']['messages'][number];

type ChatLine = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type ReplyInput = {
  conversationId: string;
  content: string;
};

type AiAssistantChatProps = {
  initialConversations: ConversationItem[];
  variant?: 'page' | 'panel';
};

export function AiAssistantChat({
  initialConversations,
  variant = 'page',
}: AiAssistantChatProps) {
  const [conversations, setConversations] =
    useState<ConversationItem[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState('');
  const [replyInput, setReplyInput] = useState<ReplyInput | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef(replyInput);

  const [loadConversation, conversationQuery] = useLazyQuery(
    AiConversationDocument,
    { fetchPolicy: 'network-only' },
  );
  const [createConversation, createResult] = useMutation(
    CreateAiConversationDocument,
  );
  const reply = useSubscription(AiAssistantReplyDocument, {
    skip: replyInput === null,
    variables: replyInput ?? { conversationId: '', content: '' },
    onData: ({ data }) => {
      const event = data.data?.aiAssistantReply;
      if (!event || (!event.delta && !event.done)) {
        return;
      }
      setMessages((current) =>
        appendDelta(current, event.messageId, event.delta),
      );
    },
    onComplete: () => {
      const id = replyInputRef.current?.conversationId;
      if (!id) {
        return;
      }
      void loadConversation({ variables: { id } }).then((result) => {
        const detail = result.data?.aiConversation;
        if (!detail) {
          return;
        }
        setMessages(visibleMessages(detail.messages));
        setConversations((current) =>
          current.map((item) =>
            item.id === detail.id ? { ...item, title: detail.title } : item,
          ),
        );
      });
    },
  });

  const creating = createResult.loading;
  const opening = conversationQuery.loading;
  const streaming =
    replyInput !== null &&
    !reply.error &&
    reply.data?.aiAssistantReply?.done !== true;
  const errorText =
    conversationQuery.error?.message ||
    createResult.error?.message ||
    reply.error?.message ||
    null;

  useEffect(() => {
    replyInputRef.current = replyInput;
  }, [replyInput]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  async function openConversation(id: string) {
    setReplyInput(null);
    setActiveId(id);
    const result = await loadConversation({ variables: { id } });
    const detail = result.data?.aiConversation;
    if (!detail) {
      return;
    }
    setMessages(visibleMessages(detail.messages));
    setConversations((current) =>
      current.map((item) =>
        item.id === detail.id ? { ...item, title: detail.title } : item,
      ),
    );
  }

  async function startConversation(): Promise<string | null> {
    const result = await createConversation().catch(() => null);
    const created = result?.data?.createAiConversation;
    if (!created) {
      return null;
    }
    setConversations((current) => [created, ...current]);
    setActiveId(created.id);
    setMessages([]);
    return created.id;
  }

  async function sendMessage() {
    const content = draft.trim();
    if (!content || creating || streaming) {
      return;
    }

    setDraft('');
    let conversationId = activeId;
    if (!conversationId) {
      conversationId = await startConversation();
      if (!conversationId) {
        setDraft(content);
        return;
      }
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
    setReplyInput({ conversationId, content });
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
            aria-busy={
              opening && conversationQuery.variables?.id === conversation.id
                ? true
                : undefined
            }
            disabled={opening}
            onClick={() => {
              void openConversation(conversation.id);
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
            {message.content || (streaming ? '…' : '')}
          </article>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );

  const errorLine = errorText ? (
    <p className="shrink-0 px-4 text-sm text-red-600 dark:text-red-400">
      {errorText}
    </p>
  ) : null;

  const composer = (
    <form
      className="flex shrink-0 gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
      aria-busy={streaming || creating || undefined}
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
        disabled={streaming || creating}
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
        disabled={streaming || creating || draft.trim().length === 0}
      >
        {streaming || creating ? 'Отправка…' : 'Отправить'}
      </button>
    </form>
  );

  const newConversationButton = (
    <button
      type="button"
      className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      disabled={creating || streaming}
      aria-busy={creating || undefined}
      onClick={() => {
        void startConversation();
      }}
    >
      {creating ? 'Создаём…' : 'Новый диалог'}
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

function visibleMessages(messages: ConversationMessage[]): ChatLine[] {
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
