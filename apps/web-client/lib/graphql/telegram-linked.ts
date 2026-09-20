import { print } from 'graphql';
import { createClient } from 'graphql-sse';

import { TELEGRAM_LINKED_SUBSCRIPTION } from '@/lib/graphql/documents';
import { getGraphqlUrl } from '@/lib/graphql/url';

type TelegramLinkedData = {
  telegramLinked?: { ok?: boolean } | null;
};

export function subscribeTelegramLinked(
  accessToken: string,
  onLinked: () => void,
): () => void {
  const client = createClient({
    singleConnection: false,
    url: getGraphqlUrl(),
    credentials: 'omit',
    retryAttempts: 5,
    headers: () => ({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  const unsubscribe = client.subscribe<TelegramLinkedData>(
    { query: print(TELEGRAM_LINKED_SUBSCRIPTION) },
    {
      next: (result) => {
        if (result.data?.telegramLinked?.ok) {
          onLinked();
        }
      },
      error: () => undefined,
      complete: () => undefined,
    },
  );

  return () => {
    unsubscribe();
    client.dispose();
  };
}
