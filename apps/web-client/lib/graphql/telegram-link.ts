import { print } from 'graphql';

import { CREATE_TELEGRAM_LINK_MUTATION } from '@/lib/graphql/documents';
import type { GraphQLResponse, TelegramLink } from '@/lib/graphql/types';
import { getGraphqlUrl } from '@/lib/graphql/url';

export class TelegramLinkError extends Error {
  readonly code: 'UNAUTHENTICATED' | 'UNKNOWN';

  constructor(message: string, code: 'UNAUTHENTICATED' | 'UNKNOWN') {
    super(message);
    this.name = 'TelegramLinkError';
    this.code = code;
  }
}

export async function createTelegramLink(options: {
  accessToken: string;
}): Promise<TelegramLink> {
  const query = print(CREATE_TELEGRAM_LINK_MUTATION);
  const response = await fetch(getGraphqlUrl(), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${options.accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query }),
    credentials: 'omit',
    cache: 'no-store',
  });

  let json: GraphQLResponse<{ createTelegramLink?: TelegramLink }>;
  try {
    json = (await response.json()) as GraphQLResponse<{
      createTelegramLink?: TelegramLink;
    }>;
  } catch {
    throw new TelegramLinkError(
      'Не удалось создать ссылку Telegram. Попробуйте ещё раз.',
      'UNKNOWN',
    );
  }

  const payload = json.data?.createTelegramLink;
  if (payload?.url) {
    return payload;
  }

  throw telegramLinkErrorFromResponse(json);
}

function telegramLinkErrorFromResponse(
  json: GraphQLResponse<unknown>,
): TelegramLinkError {
  const error = json.errors?.[0];
  const code = error?.extensions?.code;
  const message = error?.message ?? '';
  const status = error?.extensions?.http?.status;

  if (
    code === 'UNAUTHENTICATED' ||
    status === 401 ||
    /unauthor|unauthenticated/i.test(message)
  ) {
    return new TelegramLinkError('Сессия истекла', 'UNAUTHENTICATED');
  }

  return new TelegramLinkError(
    'Не удалось создать ссылку Telegram. Попробуйте ещё раз.',
    'UNKNOWN',
  );
}
