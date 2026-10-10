'use client';

import {
  useLazyQuery,
  useMutation,
  useSubscription,
} from '@apollo/client/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { AiAssistantReplyDocument } from '@libs/graphql/operations/ai-assistant/ai-assistant-reply.generated';
import { AiConversationDocument } from '@libs/graphql/operations/ai-assistant/ai-conversation.generated';
import { ConfirmAiActionDocument } from '@libs/graphql/operations/ai-assistant/confirm-ai-action.generated';
import { CreateAiConversationDocument } from '@libs/graphql/operations/ai-assistant/create-ai-conversation.generated';
import { RejectAiActionDocument } from '@libs/graphql/operations/ai-assistant/reject-ai-action.generated';

import {
  markAction,
  mergeActions,
  openCheckout,
  toActionCards,
  upsertAction,
} from './chat-actions';
import { appendDelta, appendTool, visibleMessages } from './chat-messages';
import type {
  ChatAction,
  ChatLine,
  ConversationItem,
  ReplyInput,
} from './chat-model';

const SKIPPED_REPLY_TEMPERATURE = 0.2;

export function useAiAssistantChat(initialConversations: ConversationItem[]) {
  const pathname = usePathname();
  const router = useRouter();
  const [conversations, setConversations] =
    useState<ConversationItem[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatLine[]>([]);
  const [actions, setActions] = useState<ChatAction[]>([]);
  const [replyInput, setReplyInput] = useState<ReplyInput | null>(null);
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
      temperature: SKIPPED_REPLY_TEMPERATURE,
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

  async function sendMessage(
    content: string,
    temperature: number,
  ): Promise<boolean> {
    if (!content || creating || streaming) {
      return false;
    }

    let conversationId = activeId;
    if (!conversationId) {
      conversationId = await startConversation();
      if (!conversationId) {
        return false;
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
    return true;
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

  return {
    conversations,
    activeId,
    messages,
    actions,
    creating,
    opening,
    openingId: conversationQuery.variables?.id,
    streaming,
    errorText,
    openConversation,
    startConversation,
    sendMessage,
    onConfirm,
    onReject,
  };
}
