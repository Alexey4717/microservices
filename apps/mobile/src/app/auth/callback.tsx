import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef } from 'react';

import { Muted, Screen } from '@/components/ui';
import { parseOauthHash } from '@/lib/oauth';
import { useSession } from '@/lib/session';

WebBrowser.maybeCompleteAuthSession();

export default function OauthCallbackScreen() {
  const url = Linking.useURL();
  const { ready, applyOauthTokens } = useSession();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !url || handled.current === url) {
      return;
    }

    const tokens = parseOauthHash(url);
    if (!tokens) {
      if (url.includes('error=oauth')) {
        handled.current = url;
        router.replace('/login?error=oauth');
      }
      return;
    }

    handled.current = url;
    void applyOauthTokens(tokens).then((ok) => {
      router.replace(ok ? '/' : '/login?error=oauth');
    });
  }, [applyOauthTokens, ready, url]);

  return (
    <Screen>
      <Muted>Завершаем вход…</Muted>
    </Screen>
  );
}
