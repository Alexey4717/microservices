import { useMutation } from '@apollo/client/react';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { RegisterDocument } from '@libs/graphql/operations/auth/register.generated';

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

export default function RegisterScreen() {
  const palette = usePalette();
  const params = useLocalSearchParams<{ error?: string }>();
  const oauthFailed = params.error === 'oauth';
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [register, { loading }] = useMutation(RegisterDocument);

  async function onSubmit() {
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    if (!trimmedEmail || password.length < 8) {
      setError('Введите email и пароль не короче 8 символов');
      return;
    }

    setError(null);
    try {
      const result = await register({
        variables: {
          input: {
            email: trimmedEmail,
            password,
            name: trimmedName || undefined,
          },
        },
      });
      const payload = result.data?.register;
      if (!payload) {
        setError('Не удалось зарегистрироваться. Попробуйте ещё раз.');
        return;
      }
      await signIn(payload);
      router.replace('/');
    } catch (registerError) {
      setError(authErrorMessage(registerError, 'register'));
    }
  }

  const visibleError = error ?? (oauthFailed ? OAUTH_CANCELLED_MESSAGE : null);

  return (
    <Screen>
      <Title>Регистрация</Title>
      <Muted>Создайте аккаунт. Имя можно не указывать.</Muted>
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
        autoComplete="new-password"
        label="Пароль"
        onChangeText={setPassword}
        secureTextEntry
        value={password}
      />
      <Field
        autoComplete="name"
        label="Имя"
        onChangeText={setName}
        value={name}
      />
      {visibleError ? <ErrorText>{visibleError}</ErrorText> : null}
      <PrimaryButton
        disabled={loading}
        label={loading ? 'Создаём…' : 'Создать аккаунт'}
        onPress={() => {
          void onSubmit();
        }}
      />
      <OauthButtons onError={setError} />
      <Text style={{ color: palette.muted }}>
        Уже есть аккаунт?{' '}
        <Link href="/login" style={{ color: palette.text }}>
          Войти
        </Link>
      </Text>
    </Screen>
  );
}
