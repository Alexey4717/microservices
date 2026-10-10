'use client';

import type { ConversationItem } from './chat-model';

type ConversationListProps = {
  conversations: ConversationItem[];
  activeId: string | null;
  opening: boolean;
  openingId: string | undefined;
  onOpen: (id: string) => void;
};

export function ConversationList({
  conversations,
  activeId,
  opening,
  openingId,
  onOpen,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <li className="px-2 py-3 text-sm text-zinc-500">Пока нет диалогов</li>
    );
  }

  return conversations.map((conversation) => (
    <li key={conversation.id}>
      <button
        type="button"
        className={`w-full truncate rounded-lg px-2 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
          conversation.id === activeId
            ? 'bg-zinc-100 font-medium dark:bg-zinc-800'
            : ''
        }`}
        aria-busy={opening && openingId === conversation.id ? true : undefined}
        disabled={opening}
        onClick={() => {
          void onOpen(conversation.id);
        }}
      >
        {conversation.title?.trim() || 'Новый диалог'}
      </button>
    </li>
  ));
}

type NewConversationButtonProps = {
  creating: boolean;
  streaming: boolean;
  onStart: () => Promise<string | null>;
};

export function NewConversationButton({
  creating,
  streaming,
  onStart,
}: NewConversationButtonProps) {
  return (
    <button
      type="button"
      className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      disabled={creating || streaming}
      aria-busy={creating || undefined}
      onClick={() => {
        void onStart();
      }}
    >
      {creating ? 'Создаём…' : 'Новый диалог'}
    </button>
  );
}
