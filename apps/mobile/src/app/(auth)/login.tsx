import { useMutation } from '@apollo/client/react';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { LoginDocument } from '@libs/graphql/operations/auth/login.generated';

import { OauthButtons } from '@/components/oauth-buttons';
import {
  ErrorText,
  Field,
  Muted,
  PrimaryButton,
  Screen,
  Title,
} from '@/components/ui';
import { authErrorMessage } from '@/lib/graphql-error';
import { OAUTH_CANCELLED_MESSAGE } from '@/lib/oauth';
import { useSession } from '@/lib/session';
import { usePalette } from '@/lib/theme';

export default function LoginScreen() {
  const palette = usePalette();
  const params = useLocalSearchParams<{ error?: string }>();
  const oauthFailed = params.error === 'oauth';
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [login, { loading }] = useMutation(LoginDocument);

  async function onSubmit() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || password.length < 8) {
      setError('Введите email и пароль не короче 8 символов');
      return;
    }

    setError(null);
    try {
      const result = await login({
        variables: { input: { email: trimmedEmail, password } },
      });
      const payload = result.data?.login;
      if (!payload) {
        setError('Не удалось войти. Попробуйте ещё раз.');
        return;
      }
      await signIn(payload);
      router.replace('/');
    } catch (loginError) {
      setError(authErrorMessage(loginError, 'login'));
    }
  }

  const visibleError = error ?? (oauthFailed ? OAUTH_CANCELLED_MESSAGE : null);

  return (
    <Screen>
      <Title>Вход</Title>
      <Muted>Войдите по email и паролю.</Muted>
      <Field
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        value={email}
      />
      <Field
        autoCapitalize="none"
        autoComplete="current-password"
        label="Пароль"
        onChangeText={setPassword}
        secureTextEntry
        value={password}
      />
      {visibleError ? <ErrorText>{visibleError}</ErrorText> : null}
      <PrimaryButton
        disabled={loading}
        label={loading ? 'Входим…' : 'Войти'}
        onPress={() => {
          void onSubmit();
        }}
      />
      <OauthButtons onError={setError} />
      <Text style={{ color: palette.muted }}>
        Нет аккаунта?{' '}
        <Link href="/register" style={{ color: palette.text }}>
          Зарегистрироваться
        </Link>
      </Text>
    </Screen>
  );
}
