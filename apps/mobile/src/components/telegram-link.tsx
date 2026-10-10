import { useMutation } from '@apollo/client/react';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CreateTelegramLinkDocument } from '@libs/graphql/operations/telegram/create-telegram-link.generated';

import { UserAvatar } from '@/components/user-avatar';
import { Card, Muted, PrimaryButton, SectionTitle } from '@/components/ui';
import { graphQLErrorMessage } from '@/lib/graphql-error';
import type { AuthUser } from '@/lib/session';
import { usePalette } from '@/lib/theme';

const TELEGRAM_LINK_HINT =
  'Ссылка привязки действует 10 минут. Если не успели нажать Start в Telegram, создайте новую в профиле. При повторном нажатии прежняя ссылка становится недействительной.';

type TelegramProfile = NonNullable<AuthUser['telegram']>;

type TelegramLinkProps = {
  telegram?: AuthUser['telegram'];
};

export function TelegramLink({ telegram }: TelegramLinkProps) {
  const linked = Boolean(telegram?.userId?.trim());
  if (linked && telegram) {
    return <LinkedTelegramCard telegram={telegram} />;
  }
  return <BindTelegramCard />;
}

function LinkedTelegramCard({ telegram }: { telegram: TelegramProfile }) {
  const palette = usePalette();
  const handle = telegram.username?.replace(/^@/, '').trim() || '';
  const fullName = [telegram.firstName, telegram.userLastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ');
  const title = fullName || (handle ? `@${handle}` : 'Telegram');
  const alt = fullName || (handle ? `@${handle}` : 'Telegram');

  return (
    <Card>
      <SectionTitle>Telegram</SectionTitle>
      <Muted>Telegram уже привязан к аккаунту.</Muted>
      <View style={styles.row}>
        <UserAvatar alt={alt} name={title} size={56} src={telegram.photoUrl} />
        <View style={styles.copy}>
          <Text style={[styles.name, { color: palette.text }]}>{title}</Text>
          {handle && fullName ? <Muted>@{handle}</Muted> : null}
        </View>
      </View>
    </Card>
  );
}

function BindTelegramCard() {
  const palette = usePalette();
  const [hint, setHint] = useState(false);
  const [createLink, { loading, error }] = useMutation(
    CreateTelegramLinkDocument,
  );

  async function onLink() {
    if (loading) {
      return;
    }
    const result = await createLink().catch(() => null);
    const url = result?.data?.createTelegramLink?.url;
    if (url) {
      await WebBrowser.openBrowserAsync(url);
    }
  }

  return (
    <Card>
      <View style={styles.titleRow}>
        <SectionTitle>Telegram</SectionTitle>
        <Pressable
          accessibilityLabel="Как действует ссылка привязки Telegram"
          accessibilityRole="button"
          onPress={() => {
            setHint((current) => !current);
          }}
          style={[styles.hintButton, { borderColor: palette.border }]}
        >
          <Text style={{ color: palette.muted, fontSize: 12 }}>?</Text>
        </Pressable>
      </View>
      {hint ? <Muted>{TELEGRAM_LINK_HINT}</Muted> : null}
      <Muted>
        Привяжите бота к аккаунту. Ссылка откроется в клиенте Telegram.
      </Muted>
      <PrimaryButton
        disabled={loading}
        label={loading ? 'Открываем Telegram…' : 'Привязать Telegram'}
        onPress={() => {
          void onLink();
        }}
      />
      {error ? (
        <Text accessibilityRole="alert" style={{ color: palette.danger }}>
          {graphQLErrorMessage(
            error,
            'Не удалось создать ссылку Telegram. Попробуйте ещё раз.',
          )}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hintButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
