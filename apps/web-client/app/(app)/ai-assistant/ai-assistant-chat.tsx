'use client';

import { ChatComposer } from './chat-composer';
import type { ConversationItem } from './chat-model';
import { ChatTranscript } from './chat-transcript';
import { ConversationList, NewConversationButton } from './conversation-list';
import { useAiAssistantChat } from './use-ai-assistant-chat';

type AiAssistantChatProps = {
  initialConversations: ConversationItem[];
  variant?: 'page' | 'panel';
};

export function AiAssistantChat({
  initialConversations,
  variant = 'page',
}: AiAssistantChatProps) {
  const chat = useAiAssistantChat(initialConversations);

  const conversationItems = (
    <ConversationList
      conversations={chat.conversations}
      activeId={chat.activeId}
      opening={chat.opening}
      openingId={chat.openingId}
      onOpen={chat.openConversation}
    />
  );

  const transcript = (
    <ChatTranscript
      variant={variant}
      messages={chat.messages}
      actions={chat.actions}
      streaming={chat.streaming}
      onConfirm={chat.onConfirm}
      onReject={chat.onReject}
    />
  );

  const errorLine = chat.errorText ? (
    <p className="shrink-0 px-4 text-sm text-red-600 dark:text-red-400">
      {chat.errorText}
    </p>
  ) : null;

  const composer = (
    <ChatComposer
      variant={variant}
      streaming={chat.streaming}
      creating={chat.creating}
      onSend={chat.sendMessage}
    />
  );

  const newConversationButton = (
    <NewConversationButton
      creating={chat.creating}
      streaming={chat.streaming}
      onStart={chat.startConversation}
    />
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
