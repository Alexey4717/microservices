'use client';

import { useId } from 'react';

import type { AuthUser } from '@/lib/auth/auth-user';
import { AVATAR_FILE_ACCEPT } from '@/lib/files/avatar';

import { UserAvatar } from '../user-avatar';
import { useAvatarUpload } from './use-avatar-upload';

type AvatarUploadProps = {
  accessToken: string;
  user: AuthUser;
};

export function AvatarUpload({ accessToken, user }: AvatarUploadProps) {
  const inputId = useId();
  const errorId = useId();
  const statusId = useId();
  const {
    inputRef,
    displayUrl,
    displayName,
    uploading,
    error,
    status,
    onFileChange,
  } = useAvatarUpload(accessToken, user);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <UserAvatar
        src={displayUrl}
        alt={
          displayUrl ? `Аватар ${displayName}` : `Нет аватара, ${displayName}`
        }
        size={96}
        name={displayName}
        priority
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {displayUrl
            ? 'Текущее фото профиля. Можно заменить JPEG, PNG, WebP или GIF до 2\u00a0МБ.'
            : 'Аватар не выбран. Загрузите JPEG, PNG, WebP или GIF до 2\u00a0МБ.'}
        </p>
        <label className="flex flex-col gap-1 text-sm" htmlFor={inputId}>
          Файл аватара
          <input
            ref={inputRef}
            id={inputId}
            name="avatar"
            type="file"
            accept={AVATAR_FILE_ACCEPT}
            autoComplete="off"
            disabled={uploading}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : status ? statusId : undefined}
            onChange={onFileChange}
            className="block w-full cursor-pointer touch-manipulation rounded-lg text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:file:border-zinc-700 dark:file:bg-zinc-950 dark:file:text-zinc-100 dark:hover:file:bg-zinc-800 dark:focus-visible:ring-zinc-100"
          />
        </label>
        {uploading ? (
          <p
            className="text-sm text-zinc-600 dark:text-zinc-400"
            aria-live="polite"
          >
            Загружаем…
          </p>
        ) : null}
        {error ? (
          <p
            id={errorId}
            className="text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {status && !error ? (
          <p
            id={statusId}
            className="text-sm text-zinc-600 dark:text-zinc-400"
            aria-live="polite"
          >
            {status}
          </p>
        ) : null}
      </div>
    </div>
  );
}
