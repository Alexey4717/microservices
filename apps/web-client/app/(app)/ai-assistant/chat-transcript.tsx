'use client';

import { useEffect, useRef } from 'react';

import { ChatActionCard } from './chat-action-card';
import type { ChatAction, ChatLine } from './chat-model';

type ChatTranscriptProps = {
  variant: 'page' | 'panel';
  messages: ChatLine[];
  actions: ChatAction[];
  streaming: boolean;
  onConfirm: (action: ChatAction) => Promise<void>;
  onReject: (action: ChatAction) => Promise<void>;
};

export function ChatTranscript({
  variant,
  messages,
  actions,
  streaming,
  onConfirm,
  onReject,
}: ChatTranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, actions]);

  return (
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
        <ChatActionCard
          key={action.id}
          action={action}
          onConfirm={onConfirm}
          onReject={onReject}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
