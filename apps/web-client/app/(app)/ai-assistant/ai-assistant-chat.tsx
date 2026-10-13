'use client';

import { ChatComposer } from './chat-composer';
import type { ConversationItem } from './chat-model';
import { ChatTranscript } from './chat-transcript';
import { ConversationList, NewConversationButton } from './conversation-list';
import { useAiAssistantChat } from './use-ai-assistant-chat';

type AiAssistantChatProps = {
  initialConversations: ConversationItem[];
};

export function AiAssistantChat({
  initialConversations,
}: AiAssistantChatProps) {
  const chat = useAiAssistantChat(initialConversations);

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1">
      <aside className="flex w-44 shrink-0 flex-col gap-2 border-r border-zinc-200 p-3 dark:border-zinc-800 sm:w-52">
        <NewConversationButton
          creating={chat.creating}
          streaming={chat.streaming}
          onStart={chat.startConversation}
        />
        <ul className="flex min-h-0 min-w-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
          <ConversationList
            conversations={chat.conversations}
            activeId={chat.activeId}
            opening={chat.opening}
            openingId={chat.openingId}
            deletingId={chat.deletingId}
            onOpen={chat.openConversation}
            onDelete={chat.deleteConversation}
          />
        </ul>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatTranscript
          messages={chat.messages}
          actions={chat.actions}
          streaming={chat.streaming}
          onConfirm={chat.onConfirm}
          onReject={chat.onReject}
        />
        {chat.errorText ? (
          <p className="shrink-0 px-4 text-sm text-red-600 dark:text-red-400">
            {chat.errorText}
          </p>
        ) : null}
        <ChatComposer
          streaming={chat.streaming}
          creating={chat.creating}
          onSend={chat.sendMessage}
        />
      </div>
    </section>
  );
}
