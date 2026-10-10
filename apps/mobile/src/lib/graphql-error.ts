import { CombinedGraphQLErrors } from '@apollo/client/errors';

export function isUnauthenticatedError(error: unknown): boolean {
  if (!CombinedGraphQLErrors.is(error)) {
    return false;
  }

  return error.errors.some((item) => {
    if (item.extensions?.code === 'UNAUTHENTICATED') {
      return true;
    }
    const http = item.extensions?.http;
    if (
      typeof http === 'object' &&
      http !== null &&
      'status' in http &&
      http.status === 401
    ) {
      return true;
    }
    return /unauthor|unauthenticated/i.test(item.message);
  });
}

export function graphQLErrorMessage(error: unknown, fallback: string): string {
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors[0]?.message || fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

export function authErrorMessage(
  error: unknown,
  kind: 'login' | 'register',
): string {
  const message = graphQLErrorMessage(error, '');

  if (/already registered/i.test(message)) {
    return 'Этот email уже зарегистрирован';
  }
  if (
    /invalid credentials/i.test(message) ||
    /unauthor/i.test(message) ||
    /unauthenticated/i.test(message)
  ) {
    return kind === 'login'
      ? 'Неверный email или пароль'
      : 'Не удалось зарегистрироваться';
  }

  return kind === 'login'
    ? 'Не удалось войти. Попробуйте ещё раз.'
    : 'Не удалось зарегистрироваться. Попробуйте ещё раз.';
}

export function uploadErrorMessage(error: unknown): string {
  const message = graphQLErrorMessage(error, '');
  if (/unauthor|unauthenticated/i.test(message)) {
    return 'Сессия истекла. Войдите снова и повторите загрузку.';
  }
  if (/unsupported image type/i.test(message)) {
    return 'Неподдерживаемый тип файла. Выберите JPEG, PNG, WebP или GIF.';
  }
  if (/file too large/i.test(message)) {
    return 'Файл слишком большой. Максимум 2\u00a0МБ.';
  }
  if (message) {
    return message;
  }
  return 'Не удалось загрузить аватар. Попробуйте ещё раз.';
}

export function isPremiumConflict(error: unknown): boolean {
  if (!CombinedGraphQLErrors.is(error)) {
    const message = error instanceof Error ? error.message : '';
    return /already purchased/i.test(message);
  }

  const graphQLError = error.errors[0];
  const code = graphQLError?.extensions?.code;
  const http = graphQLError?.extensions?.http;
  const status =
    typeof http === 'object' && http && 'status' in http
      ? http.status
      : undefined;
  if (code === 'CONFLICT' || status === 409) {
    return true;
  }
  return /already purchased/i.test(graphQLError?.message ?? '');
}
