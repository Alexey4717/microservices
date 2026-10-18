import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useMutation } from '@apollo/client/react';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';

import { LoginDocument } from '@libs/graphql/operations/auth/login.generated';

import { Page } from '../components/Page';
import { useSession } from '../session-context';
import styles from './LoginPage.module.scss';

export function LoginPage() {
  const navigate = useNavigate();
  const { notice, signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(notice);
  const [login, { loading }] = useMutation(LoginDocument);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || password.length < 8) {
      setFormError('Введите email и пароль не короче 8 символов');
      return;
    }

    setFormError(null);
    try {
      const result = await login({
        variables: { input: { email: trimmedEmail, password } },
      });
      const payload = result.data?.login;
      if (!payload?.accessToken || !payload.refreshToken) {
        setFormError('Не удалось войти. Попробуйте ещё раз.');
        return;
      }
      try {
        await signIn({
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
        });
      } catch {
        setFormError('Не удалось сохранить сессию. Попробуйте ещё раз.');
        return;
      }
      navigate('/', { replace: true });
    } catch (error) {
      setFormError(loginErrorMessage(error));
    }
  }

  return (
    <Page heading="Вход">
      <form className={styles.form} onSubmit={(event) => void onSubmit(event)}>
        <p className={styles.muted}>Войдите по email и паролю.</p>

        <label className={styles.field}>
          Email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setFormError(null);
            }}
          />
        </label>

        <label className={styles.field}>
          Пароль
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setFormError(null);
            }}
          />
        </label>

        {formError ? (
          <p className={styles.error} role="alert">
            {formError}
          </p>
        ) : null}

        <button type="submit" className={styles.primary} disabled={loading}>
          {loading ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </Page>
  );
}

function loginErrorMessage(error: unknown): string {
  const message = errorText(error);
  if (
    /invalid credentials/i.test(message) ||
    /unauthor/i.test(message) ||
    /unauthenticated/i.test(message)
  ) {
    return 'Неверный email или пароль';
  }
  return 'Не удалось войти. Попробуйте ещё раз.';
}

function errorText(error: unknown): string {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors.map((item) => item.message).join(' ');
  }
  return error instanceof Error ? error.message : '';
}
