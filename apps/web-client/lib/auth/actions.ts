'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import type { AuthUser } from '@/lib/graphql/types';

import { REFRESH_COOKIE_NAME } from './constants';
import {
  loginWithPassword,
  logoutAtGateway,
  registerWithPassword,
} from './gateway-auth';
import { patchCachedUser } from './session-store';
import { clearRefreshCookie, persistRefreshCookie } from './set-cookie';

export type AuthFormState = { error: string } | null;

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || password.length < 8) {
    return { error: 'Введите email и пароль не короче 8 символов' };
  }

  try {
    const result = await loginWithPassword(email, password);
    await persistRefreshCookie(result.refreshToken);
  } catch (error) {
    return { error: toAuthErrorMessage(error, 'login') };
  }

  redirect('/');
}

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const name = String(formData.get('name') ?? '').trim();

  if (!email || password.length < 8) {
    return { error: 'Введите email и пароль не короче 8 символов' };
  }

  try {
    const result = await registerWithPassword({
      email,
      password,
      name: name || undefined,
    });
    await persistRefreshCookie(result.refreshToken);
  } catch (error) {
    return { error: toAuthErrorMessage(error, 'register') };
  }

  redirect('/');
}

export async function completeOauthCallback(
  refreshToken: string,
): Promise<void> {
  const token = refreshToken.trim();
  if (!token) {
    redirect('/login?error=oauth');
  }

  await persistRefreshCookie(token);
  redirect('/');
}

export async function rememberSessionUser(user: AuthUser): Promise<void> {
  if (!user.id || !user.email) {
    return;
  }

  patchCachedUser({
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    avatarUrl: user.avatarUrl ?? null,
  });
  revalidatePath('/', 'layout');
}

export async function logoutAction(): Promise<void> {
  const refreshToken = (await cookies()).get(REFRESH_COOKIE_NAME)?.value;

  try {
    await logoutAtGateway(refreshToken);
  } catch {
    // Cookie still cleared below so the browser session ends.
  }

  await clearRefreshCookie();
  redirect('/login');
}

function toAuthErrorMessage(
  error: unknown,
  kind: 'login' | 'register',
): string {
  const message = error instanceof Error ? error.message : '';

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
