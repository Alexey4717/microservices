import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { Muted, SectionTitle } from '@/components/ui';
import {
  formatAmountMinor,
  formatPaymentDate,
  paymentListStatusLabel,
  paymentProviderLabel,
  type PaymentModel,
} from '@/lib/payment';
import { usePalette } from '@/lib/theme';

type PaymentsListProps = {
  payments: PaymentModel[];
};

export function PaymentsList({ payments }: PaymentsListProps) {
  const palette = usePalette();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.card, borderColor: palette.border },
      ]}
    >
      <SectionTitle>Платежи</SectionTitle>
      {payments.length === 0 ? (
        <Muted>Платежей пока нет</Muted>
      ) : (
        payments.map((payment, index) => (
          <View
            key={payment.id}
            style={[
              styles.item,
              index > 0
                ? { borderTopColor: palette.border, borderTopWidth: 1 }
                : null,
            ]}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                router.push({
                  pathname: '/payments/[id]',
                  params: { id: payment.id },
                });
              }}
            >
              <View style={styles.line}>
                <Text style={[styles.strong, { color: palette.text }]}>
                  {paymentProviderLabel[payment.provider] ?? payment.provider}
                </Text>
                <Text style={{ color: palette.muted }}>
                  {formatAmountMinor(payment.amountMinor, payment.currency)}
                </Text>
              </View>
              <View style={styles.line}>
                <Text style={{ color: palette.muted }}>
                  {paymentListStatusLabel[payment.status] ?? payment.status}
                </Text>
                <Text style={{ color: palette.muted }}>
                  {formatPaymentDate(payment.createdAt)}
                </Text>
              </View>
            </Pressable>
            {payment.status === 'PENDING' && payment.checkoutUrl ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => {
                  void WebBrowser.openBrowserAsync(payment.checkoutUrl!);
                }}
              >
                <Text style={[styles.link, { color: palette.text }]}>
                  Продолжить оплату
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  item: {
    gap: 6,
    paddingTop: 12,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  strong: {
    fontWeight: '600',
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});
