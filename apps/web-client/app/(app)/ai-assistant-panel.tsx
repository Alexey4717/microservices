'use client';

import { useQuery } from '@apollo/client/react';
import { useEffect, useRef } from 'react';

import { AiConversationsDocument } from '@libs/graphql/operations/ai-assistant/ai-conversations.generated';

import { AiAssistantChat } from './ai-assistant/ai-assistant-chat';

type AiAssistantPanelProps = {
  showPanel: boolean;
  focusCloseRef: { current: boolean };
  onClose: () => void;
};

export function AiAssistantPanel({
  showPanel,
  focusCloseRef,
  onClose,
}: AiAssistantPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const conversationsQuery = useQuery(AiConversationsDocument, {
    skip: !showPanel,
  });
  const conversations = conversationsQuery.data?.aiConversations;
  const loadError = conversationsQuery.error;

  useEffect(() => {
    if (!showPanel || !focusCloseRef.current) {
      return;
    }
    focusCloseRef.current = false;
    closeRef.current?.focus();
  }, [focusCloseRef, showPanel]);

  useEffect(() => {
    if (!showPanel) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, showPanel]);

  return (
    <section
      className={
        showPanel
          ? 'fixed right-4 bottom-4 z-40 flex h-[min(32rem,calc(100dvh-5.5rem))] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900'
          : 'hidden'
      }
      role="dialog"
      aria-label="Чат с ИИ-ассистентом"
      aria-hidden={showPanel ? undefined : true}
      inert={showPanel ? undefined : true}
      aria-busy={
        conversationsQuery.loading && !conversations ? true : undefined
      }
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">ИИ-ассистент</h2>
        <button
          ref={closeRef}
          type="button"
          className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          aria-label="Закрыть чат"
          onClick={onClose}
        >
          Закрыть
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        {conversations ? (
          <AiAssistantChat
            variant="panel"
            initialConversations={conversations}
          />
        ) : (
          <div className="flex flex-1 flex-col gap-3 p-4">
            <p className="text-sm text-zinc-500">
              {loadError
                ? loadError.message || 'Не удалось загрузить диалоги'
                : 'Загрузка диалогов…'}
            </p>
            {loadError ? (
              <button
                type="button"
                className="self-start rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                onClick={() => {
                  void conversationsQuery.refetch();
                }}
              >
                Повторить
              </button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
