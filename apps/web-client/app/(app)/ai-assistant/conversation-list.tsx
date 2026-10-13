'use client';

import type { ConversationItem } from './chat-model';

type ConversationListProps = {
  conversations: ConversationItem[];
  activeId: string | null;
  opening: boolean;
  openingId: string | undefined;
  deletingId: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
};

export function ConversationList({
  conversations,
  activeId,
  opening,
  openingId,
  deletingId,
  onOpen,
  onDelete,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <li className="px-2 py-3 text-sm text-zinc-500">Пока нет диалогов</li>
    );
  }

  return conversations.map((conversation) => {
    const busy =
      (opening && openingId === conversation.id) ||
      deletingId === conversation.id;

    return (
      <li key={conversation.id} className="flex min-w-0 items-stretch gap-1">
        <button
          type="button"
          className={`min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
            conversation.id === activeId
              ? 'bg-zinc-100 font-medium dark:bg-zinc-800'
              : ''
          }`}
          aria-busy={busy || undefined}
          disabled={opening || deletingId !== null}
          onClick={() => {
            void onOpen(conversation.id);
          }}
        >
          {conversation.title?.trim() || 'Новый диалог'}
        </button>
        <button
          type="button"
          className="shrink-0 rounded-lg px-2 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-60 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Удалить диалог"
          disabled={opening || deletingId !== null}
          onClick={(event) => {
            event.stopPropagation();
            void onDelete(conversation.id);
          }}
        >
          ×
        </button>
      </li>
    );
  });
}

type NewConversationButtonProps = {
  streaming: boolean;
  creating: boolean;
  onStart: () => void;
};

export function NewConversationButton({
  streaming,
  creating,
  onStart,
}: NewConversationButtonProps) {
  return (
    <button
      type="button"
      className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      disabled={creating || streaming}
      onClick={onStart}
    >
      Новый диалог
    </button>
  );
}
