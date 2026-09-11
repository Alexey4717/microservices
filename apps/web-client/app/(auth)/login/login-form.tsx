'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { loginAction } from '@/lib/auth/actions';

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Вход</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Войдите по email и паролю.
      </p>

      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Пароль
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100"
        />
      </label>

      {state?.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? 'Входим…' : 'Войти'}
      </button>

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Нет аккаунта?{' '}
        <Link
          className="font-medium text-zinc-900 underline dark:text-zinc-50"
          href="/register"
        >
          Зарегистрироваться
        </Link>
      </p>
    </form>
  );
}
