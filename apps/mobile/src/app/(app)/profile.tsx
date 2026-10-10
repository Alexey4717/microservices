import { useQuery } from '@apollo/client/react';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Text, View } from 'react-native';

import { MyPaymentsDocument } from '@libs/graphql/operations/payments/my-payments.generated';
import { MeDocument } from '@libs/graphql/operations/user/me.generated';

import { AvatarUpload } from '@/components/avatar-upload';
import { PaymentsList } from '@/components/payments-list';
import { PremiumCheckout } from '@/components/premium-checkout';
import { TelegramLink } from '@/components/telegram-link';
import { Card, Muted, Screen, Title } from '@/components/ui';
import { usePalette } from '@/lib/theme';

export default function ProfileScreen() {
  const palette = usePalette();
  const watched = useQuery(MeDocument, {
    fetchPolicy: 'cache-and-network',
  });
  const linked = Boolean(watched.data?.me.telegram?.userId?.trim());
  const me = useQuery(MeDocument, {
    fetchPolicy: 'cache-and-network',
    pollInterval: linked ? 0 : 3000,
  });
  const payments = useQuery(MyPaymentsDocument, {
    fetchPolicy: 'cache-and-network',
  });

  const refetchMe = me.refetch;
  const refetchPayments = payments.refetch;
  useFocusEffect(
    useCallback(() => {
      void refetchMe();
      void refetchPayments();
    }, [refetchMe, refetchPayments]),
  );

  const user = me.data?.me;
  const tierLabel = user?.accountTier === 'PREMIUM' ? 'PREMIUM' : 'Базовый';

  return (
    <Screen>
      <Title>Профиль</Title>
      {me.loading && !user ? <Muted>Загружаем профиль…</Muted> : null}
      {me.error && !user ? (
        <Text accessibilityRole="alert" style={{ color: palette.danger }}>
          Не удалось загрузить профиль.
        </Text>
      ) : null}
      {user ? (
        <>
          <Card>
            <AvatarUpload user={user} />
            <View style={{ gap: 10 }}>
              <Fact label="Email" value={user.email} />
              <Fact label="Имя" value={user.name?.trim() || 'Не указано'} />
              <Fact label="Тариф" value={tierLabel} />
              <Fact label="ID" value={user.id} mono />
            </View>
          </Card>
          <TelegramLink telegram={user.telegram} />
          <PremiumCheckout user={user} />
          {payments.loading && !payments.data ? (
            <Muted>Загружаем платежи…</Muted>
          ) : null}
          <PaymentsList payments={payments.data?.myPayments ?? []} />
        </>
      ) : null}
    </Screen>
  );
}

function Fact({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const palette = usePalette();
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ color: palette.muted, fontSize: 13 }}>{label}</Text>
      <Text
        style={{
          color: palette.text,
          fontWeight: '600',
          fontFamily: mono ? 'monospace' : undefined,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
