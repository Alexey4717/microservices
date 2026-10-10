import { useQuery } from '@apollo/client/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { GetPaymentDocument } from '@libs/graphql/operations/payments/get-payment.generated';

import { Card, Muted, Screen, Title } from '@/components/ui';
import {
  formatAmountMinor,
  formatPaymentDate,
  paymentOrderStatusLabel,
  paymentProviderLabel,
} from '@/lib/payment';
import { usePalette } from '@/lib/theme';

const SLOW_AFTER_MS = 30_000;

export default function PaymentOrderScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id ?? '');
  return <PaymentOrder key={id} id={id} />;
}

function PaymentOrder({ id }: { id: string }) {
  const palette = usePalette();
  const [slow, setSlow] = useState(false);
  const watched = useQuery(GetPaymentDocument, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const status = watched.data?.payment.status;
  const pollInterval = status && status !== 'PENDING' ? 0 : slow ? 5000 : 2000;
  const paymentQuery = useQuery(GetPaymentDocument, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'network-only',
    pollInterval,
  });
  const payment = paymentQuery.data?.payment ?? watched.data?.payment;

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Screen>
      <Title>Заказ</Title>
      {!id ? <Muted>Заказ не найден.</Muted> : null}
      {paymentQuery.loading && !payment ? (
        <Muted>Загружаем заказ…</Muted>
      ) : null}
      {paymentQuery.error && !payment ? (
        <Text accessibilityRole="alert" style={{ color: palette.danger }}>
          Не удалось загрузить заказ.
        </Text>
      ) : null}
      {payment ? (
        <Card>
          <Fact label="Продукт" value={payment.productCode} />
          <Fact
            label="Провайдер"
            value={paymentProviderLabel[payment.provider] ?? payment.provider}
          />
          <Fact
            label="Сумма"
            value={formatAmountMinor(payment.amountMinor, payment.currency)}
          />
          <Fact label="Создан" value={formatPaymentDate(payment.createdAt)} />
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: palette.text, fontWeight: '600' }}
          >
            {paymentOrderStatusLabel[payment.status] ?? payment.status}
          </Text>
          {payment.status === 'PENDING' && payment.checkoutUrl ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                const checkoutUrl = payment.checkoutUrl;
                if (checkoutUrl) {
                  void WebBrowser.openBrowserAsync(checkoutUrl);
                }
              }}
            >
              <Text
                style={{
                  color: palette.text,
                  fontWeight: '600',
                  textDecorationLine: 'underline',
                }}
              >
                Продолжить оплату
              </Text>
            </Pressable>
          ) : null}
        </Card>
      ) : null}
      <Pressable
        accessibilityRole="link"
        onPress={() => {
          router.push('/profile');
        }}
      >
        <Text
          style={{
            color: palette.text,
            fontWeight: '600',
            textDecorationLine: 'underline',
          }}
        >
          Вернуться в профиль
        </Text>
      </Pressable>
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  const palette = usePalette();
  return (
    <View style={{ gap: 2 }}>
      <Text style={{ color: palette.muted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: palette.text, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}
