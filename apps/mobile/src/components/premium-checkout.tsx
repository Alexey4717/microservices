import { useMutation } from '@apollo/client/react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { CreateCheckoutDocument } from '@libs/graphql/operations/payments/create-checkout.generated';

import {
  Card,
  Muted,
  PrimaryButton,
  SecondaryButton,
  SectionTitle,
} from '@/components/ui';
import { graphQLErrorMessage, isPremiumConflict } from '@/lib/graphql-error';
import type { PaymentProvider } from '@/lib/payment';
import type { AuthUser } from '@/lib/session';
import { usePalette } from '@/lib/theme';

const PREMIUM_PRICE_LABEL = '9,99\u00a0USD';

type PremiumCheckoutProps = {
  user: AuthUser;
};

export function PremiumCheckout({ user }: PremiumCheckoutProps) {
  const palette = usePalette();
  const [payWithStripe, stripe] = useMutation(CreateCheckoutDocument);
  const [payWithPaypal, paypal] = useMutation(CreateCheckoutDocument);
  const isPremium = user.accountTier === 'PREMIUM';
  const hookError = stripe.error ?? paypal.error;
  const alreadyPurchased = isPremiumConflict(hookError);
  const hideBuyButtons = isPremium || alreadyPurchased;
  const requesting = stripe.loading || paypal.loading;

  async function onPay(provider: PaymentProvider) {
    if (requesting) {
      return;
    }
    const pay = provider === 'STRIPE' ? payWithStripe : payWithPaypal;
    const result = await pay({
      variables: { input: { provider } },
    }).catch(() => null);
    const paymentId = result?.data?.createCheckout?.paymentId;
    if (paymentId) {
      router.push({
        pathname: '/payments/[id]',
        params: { id: paymentId },
      });
    }
  }

  return (
    <Card>
      <SectionTitle>PREMIUM</SectionTitle>
      <Muted>Разовая покупка доступа. Стоимость {PREMIUM_PRICE_LABEL}.</Muted>
      {isPremium ? (
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: palette.buttonBg,
            borderRadius: 999,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{
              color: palette.buttonText,
              fontSize: 12,
              fontWeight: '700',
            }}
          >
            PREMIUM
          </Text>
        </View>
      ) : null}
      {alreadyPurchased && !isPremium ? (
        <Muted>PREMIUM уже куплен</Muted>
      ) : null}
      {hideBuyButtons ? null : (
        <View style={{ gap: 8 }}>
          <PrimaryButton
            disabled={requesting}
            label={
              stripe.loading
                ? 'Переходим к оплате…'
                : 'Оплатить картой (Stripe)'
            }
            onPress={() => {
              void onPay('STRIPE');
            }}
          />
          <SecondaryButton
            disabled={requesting}
            label={paypal.loading ? 'Переходим к оплате…' : 'PayPal'}
            onPress={() => {
              void onPay('PAYPAL');
            }}
          />
        </View>
      )}
      {requesting ? <Muted>Переходим к оплате…</Muted> : null}
      {hookError && !alreadyPurchased ? (
        <Text accessibilityRole="alert" style={{ color: palette.danger }}>
          {graphQLErrorMessage(
            hookError,
            'Не удалось создать оплату. Попробуйте ещё раз.',
          )}
        </Text>
      ) : null}
    </Card>
  );
}
