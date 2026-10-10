'use client';

import { useMutation, useSubscription } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { CreateTelegramLinkDocument } from '@libs/graphql/operations/telegram/create-telegram-link.generated';
import { TelegramLinkedDocument } from '@libs/graphql/operations/telegram/telegram-linked.generated';

export function useBindTelegram() {
  const router = useRouter();
  const [createLink, { loading, error }] = useMutation(
    CreateTelegramLinkDocument,
  );

  useSubscription(TelegramLinkedDocument, {
    onData: ({ data }) => {
      if (data.data?.telegramLinked?.ok) {
        router.refresh();
      }
    },
  });

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    }

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [router]);

  async function onLink() {
    if (loading) {
      return;
    }

    const result = await createLink().catch(() => null);
    const url = result?.data?.createTelegramLink?.url;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  return { loading, error, onLink };
}
