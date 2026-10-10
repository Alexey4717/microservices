import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/lib/session';
import { OAUTH_CANCELLED_MESSAGE, startProviderOauth } from '@/lib/oauth';
import { usePalette } from '@/lib/theme';

import { SecondaryButton } from './ui';

type OauthButtonsProps = {
  onError: (message: string) => void;
};

export function OauthButtons({ onError }: OauthButtonsProps) {
  const palette = usePalette();
  const { applyOauthTokens } = useSession();
  const [pending, setPending] = useState<'google' | 'github' | null>(null);

  async function onPress(provider: 'google' | 'github') {
    if (pending) {
      return;
    }
    setPending(provider);
    try {
      const result = await startProviderOauth(provider);
      if (result.kind === 'cancel') {
        return;
      }
      if (result.kind === 'error') {
        onError(OAUTH_CANCELLED_MESSAGE);
        return;
      }
      const ok = await applyOauthTokens(result);
      if (!ok) {
        onError(OAUTH_CANCELLED_MESSAGE);
        return;
      }
      router.replace('/');
    } catch {
      onError(OAUTH_CANCELLED_MESSAGE);
    } finally {
      setPending(null);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={[styles.line, { backgroundColor: palette.border }]} />
        <Text style={{ color: palette.muted }}>или</Text>
        <View style={[styles.line, { backgroundColor: palette.border }]} />
      </View>
      <SecondaryButton
        disabled={pending !== null}
        label={pending === 'google' ? 'Открываем Google…' : 'Google'}
        onPress={() => {
          void onPress('google');
        }}
      />
      <SecondaryButton
        disabled={pending !== null}
        label={pending === 'github' ? 'Открываем GitHub…' : 'GitHub'}
        onPress={() => {
          void onPress('github');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  line: {
    flex: 1,
    height: 1,
  },
});
