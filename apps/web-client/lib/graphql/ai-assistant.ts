import { print } from 'graphql';
import { createClient } from 'graphql-sse';

import {
  AI_ASSISTANT_REPLY_SUBSCRIPTION,
  AI_CONVERSATIONS_QUERY,
  AI_CONVERSATION_QUERY,
  CREATE_AI_CONVERSATION_MUTATION,
} from '@/lib/graphql/documents';
import type {
  AiAssistantReply,
  AiConversation,
  AiConversationDetail,
  GraphQLResponse,
} from '@/lib/graphql/types';
import { getGraphqlUrl } from '@/lib/graphql/url';

type GraphqlError = { message?: string };

async function graphqlRequest<T>(
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(getGraphqlUrl(), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
    credentials: 'omit',
    cache: 'no-store',
  });

  let json: GraphQLResponse<T>;
  try {
    json = (await response.json()) as GraphQLResponse<T>;
  } catch {
    throw new Error('Сервер вернул некорректный ответ');
  }

  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message || 'Запрос не выполнен');
  }
  if (!json.data) {
    throw new Error('Пустой ответ сервера');
  }
  return json.data;
}

export async function listAiConversations(options: {
  accessToken: string;
}): Promise<AiConversation[]> {
  const data = await graphqlRequest<{
    aiConversations?: AiConversation[];
  }>(options.accessToken, print(AI_CONVERSATIONS_QUERY));
  return data.aiConversations ?? [];
}

export async function createAiConversation(options: {
  accessToken: string;
}): Promise<AiConversation> {
  const data = await graphqlRequest<{
    createAiConversation?: AiConversation;
  }>(options.accessToken, print(CREATE_AI_CONVERSATION_MUTATION));
  if (!data.createAiConversation) {
    throw new Error('Не удалось создать диалог');
  }
  return data.createAiConversation;
}

export async function getAiConversation(options: {
  id: string;
  accessToken: string;
}): Promise<AiConversationDetail> {
  const data = await graphqlRequest<{
    aiConversation?: AiConversationDetail;
  }>(options.accessToken, print(AI_CONVERSATION_QUERY), { id: options.id });
  if (!data.aiConversation) {
    throw new Error('Диалог не найден');
  }
  return data.aiConversation;
}

export function subscribeAiAssistantReply(options: {
  accessToken: string;
  conversationId: string;
  content: string;
  onReply: (event: AiAssistantReply) => void;
  onError: (message: string) => void;
  onComplete: () => void;
}): () => void {
  const client = createClient({
    singleConnection: false,
    url: getGraphqlUrl(),
    credentials: 'omit',
    retryAttempts: 0,
    headers: () => ({
      Authorization: `Bearer ${options.accessToken}`,
    }),
  });

  const unsubscribe = client.subscribe<{
    aiAssistantReply?: AiAssistantReply | null;
  }>(
    {
      query: print(AI_ASSISTANT_REPLY_SUBSCRIPTION),
      variables: {
        conversationId: options.conversationId,
        content: options.content,
      },
    },
    {
      next: (result) => {
        const event = result.data?.aiAssistantReply;
        if (event) {
          options.onReply(event);
        }
        const message = (result as { errors?: GraphqlError[] }).errors?.[0]
          ?.message;
        if (message) {
          options.onError(message);
        }
      },
      error: (error) => {
        options.onError(readStreamError(error));
      },
      complete: () => {
        options.onComplete();
      },
    },
  );

  return () => {
    unsubscribe();
    client.dispose();
  };
}

function readStreamError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.trim()
  ) {
    return error.message;
  }
  return 'Не удалось получить ответ';
}
