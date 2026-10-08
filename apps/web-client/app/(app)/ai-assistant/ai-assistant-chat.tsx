'use client';

import {
  useLazyQuery,
  useMutation,
  useSubscription,
} from '@apollo/client/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AiAssistantReplyDocument } from '@libs/graphql/operations/ai-assistant/ai-assistant-reply.generated';
import {
  AiConversationDocument,
  type AiConversationQuery,
} from '@libs/graphql/operations/ai-assistant/ai-conversation.generated';
import type { AiConversationsQuery } from '@libs/graphql/operations/ai-assistant/ai-conversations.generated';
import { ConfirmAiActionDocument } from '@libs/graphql/operations/ai-assistant/confirm-ai-action.generated';
import { CreateAiConversationDocument } from '@libs/graphql/operations/ai-assistant/create-ai-conversation.generated';
import { RejectAiActionDocument } from '@libs/graphql/operations/ai-assistant/reject-ai-action.generated';

type ConversationItem = AiConversationsQuery['aiConversations'][number];
type ConversationMessage =
  AiConversationQuery['aiConversation']['messages'][number];
type ConversationAction =
  AiConversationQuery['aiConversation']['actions'][number];

type ChatLine = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tools?: string[];
};

type ChatAction = {
  id: string;
  type: string;
  title: string;
  status: 'pending' | 'confirmed' | 'rejected';
  busy: boolean;
  error: string | null;
};

type ReplyInput = {
  conversationId: string;
  content: string;
  pagePath: string;
  temperature: number;
};

type AiAssistantChatProps = {
  initialConversations: ConversationItem[];
  variant?: 'page' | 'panel';
};

export function AiAssistantChat({
  initialConversations,
  variant = 'page',
}: AiAssistantChatProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [conversations, setConversations] =
    useState<ConversationItem[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [actions, setActions] = useState<ChatAction[]>([]);
  const [draft, setDraft] = useState('');
  const [temperature, setTemperature] = useState(0.2);
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
  const [confirmAction] = useMutation(ConfirmAiActionDocument);
  const [rejectAction] = useMutation(RejectAiActionDocument);
  const reply = useSubscription(AiAssistantReplyDocument, {
    skip: replyInput === null,
    variables: replyInput ?? {
      conversationId: '',
      content: '',
      pagePath: pathname,
      temperature,
    },
    onData: ({ data }) => {
      const event = data.data?.aiAssistantReply;
      if (!event) {
        return;
      }
      const toolName = event.toolName;
      if (toolName) {
        setMessages((current) =>
          appendTool(current, event.messageId, toolName),
        );
      }
      const card = event.action;
      if (card && card.id) {
        setActions((current) =>
          upsertAction(current, {
            id: card.id,
            type: card.type,
            title: card.title,
          }),
        );
      }
      if (!event.delta && !event.done) {
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
        setActions((current) =>
          mergeActions(current, toActionCards(detail.actions)),
        );
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
  }, [messages, actions]);

  async function openConversation(id: string) {
    setReplyInput(null);
    setActiveId(id);
    const result = await loadConversation({ variables: { id } });
    const detail = result.data?.aiConversation;
    if (!detail) {
      return;
    }
    setMessages(visibleMessages(detail.messages));
    setActions(toActionCards(detail.actions));
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
    setActions([]);
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
    setReplyInput({
      conversationId,
      content,
      pagePath: pathname,
      temperature,
    });
  }

  async function onConfirm(action: ChatAction) {
    if (action.busy || action.status !== 'pending') {
      return;
    }
    setActions((current) =>
      markAction(current, action.id, { busy: true, error: null }),
    );
    const result = await confirmAction({
      variables: { actionId: action.id },
    }).catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Не удалось подтвердить';
      setActions((current) =>
        markAction(current, action.id, { busy: false, error: message }),
      );
      return null;
    });
    const payload = result?.data?.confirmAiAction;
    if (!payload) {
      setActions((current) =>
        current.map((item) =>
          item.id === action.id && item.busy
            ? {
                ...item,
                busy: false,
                error: item.error ?? 'Не удалось подтвердить',
              }
            : item,
        ),
      );
      return;
    }
    setActions((current) =>
      markAction(current, action.id, {
        busy: false,
        error: null,
        status: payload.status === 'rejected' ? 'rejected' : 'confirmed',
      }),
    );
    if (payload.checkoutUrl) {
      openCheckout(payload.checkoutUrl);
    }
    if (payload.path) {
      router.push(payload.path);
    }
  }

  async function onReject(action: ChatAction) {
    if (action.busy || action.status !== 'pending') {
      return;
    }
    setActions((current) =>
      markAction(current, action.id, { busy: true, error: null }),
    );
    const result = await rejectAction({
      variables: { actionId: action.id },
    }).catch((error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Не удалось отклонить';
      setActions((current) =>
        markAction(current, action.id, { busy: false, error: message }),
      );
      return null;
    });
    const payload = result?.data?.rejectAiAction;
    if (!payload) {
      setActions((current) =>
        current.map((item) =>
          item.id === action.id && item.busy
            ? {
                ...item,
                busy: false,
                error: item.error ?? 'Не удалось отклонить',
              }
            : item,
        ),
      );
      return;
    }
    setActions((current) =>
      markAction(current, action.id, {
        busy: false,
        error: null,
        status: 'rejected',
      }),
    );
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
      {messages.length === 0 && actions.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Выберите диалог или напишите первое сообщение.
        </p>
      ) : (
        messages.map((message) => (
          <article
            key={message.id}
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
              message.role === 'user'
                ? 'ml-auto bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
            }`}
          >
            {message.role === 'assistant' && message.tools?.length ? (
              <p className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
                Инструменты: {message.tools.join(' → ')}
              </p>
            ) : null}
            <p className="whitespace-pre-wrap">
              {message.content || (streaming ? '…' : '')}
            </p>
          </article>
        ))
      )}
      {actions.map((action) => (
        <article
          key={action.id}
          className="max-w-[85%] rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        >
          <p className="font-medium">{action.title}</p>
          {action.status === 'pending' ? (
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                disabled={action.busy}
                onClick={() => {
                  void onConfirm(action);
                }}
              >
                {action.busy ? 'Подтверждаем…' : 'Подтвердить'}
              </button>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
                disabled={action.busy}
                onClick={() => {
                  void onReject(action);
                }}
              >
                Отклонить
              </button>
            </div>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">
              {action.status === 'confirmed' ? 'Подтверждено' : 'Отклонено'}
            </p>
          )}
          {action.error ? (
            <p
              className="mt-1 text-xs text-red-600 dark:text-red-400"
              role="alert"
            >
              {action.error}
            </p>
          ) : null}
        </article>
      ))}
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
      className="flex shrink-0 flex-col gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
      aria-busy={streaming || creating || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        void sendMessage();
      }}
    >
      <label className="flex items-center gap-2 text-xs text-zinc-500">
        Температура
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={temperature}
          aria-label="Температура ответа"
          aria-valuemin={0}
          aria-valuemax={1}
          aria-valuenow={temperature}
          className="w-28 accent-zinc-900 dark:accent-zinc-100"
          onChange={(event) => setTemperature(Number(event.target.value))}
        />
        <span className="tabular-nums">{temperature.toFixed(1)}</span>
      </label>
      <div className="flex gap-2">
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
      </div>
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

function appendTool(
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

function toActionCards(actions: ConversationAction[]): ChatAction[] {
  return actions
    .filter((action) => action.status === 'pending')
    .map((action) => ({
      id: action.id,
      type: action.type,
      title: action.title,
      status: 'pending',
      busy: false,
      error: null,
    }));
}

function upsertAction(
  actions: ChatAction[],
  action: { id: string; type: string; title: string },
): ChatAction[] {
  if (actions.some((item) => item.id === action.id)) {
    return actions;
  }
  return [
    ...actions,
    {
      ...action,
      status: 'pending',
      busy: false,
      error: null,
    },
  ];
}

function mergeActions(
  current: ChatAction[],
  pending: ChatAction[],
): ChatAction[] {
  const pendingIds = new Set(pending.map((action) => action.id));
  const resolved = current.filter(
    (action) => action.status !== 'pending' && !pendingIds.has(action.id),
  );
  const keptPending = pending.map((action) => {
    const existing = current.find((item) => item.id === action.id);
    return existing?.busy
      ? { ...action, busy: true, error: existing.error }
      : action;
  });
  return [...keptPending, ...resolved];
}

function markAction(
  actions: ChatAction[],
  id: string,
  patch: Partial<Pick<ChatAction, 'busy' | 'error' | 'status'>>,
): ChatAction[] {
  return actions.map((action) =>
    action.id === id ? { ...action, ...patch } : action,
  );
}

function openCheckout(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return;
  }
  const href = parsed.toString();
  const opened = window.open(href, '_blank', 'noopener,noreferrer');
  if (!opened) {
    window.location.assign(href);
  }
}
