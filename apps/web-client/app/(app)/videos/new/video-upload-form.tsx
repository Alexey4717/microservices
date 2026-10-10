'use client';

import { useId } from 'react';

import {
  VIDEO_DESCRIPTION_MAX_LENGTH,
  VIDEO_FILE_ACCEPT,
  VIDEO_TITLE_MAX_LENGTH,
} from '@/lib/files/video';

import { useVideoUpload } from './use-video-upload';

export function VideoUploadForm() {
  const titleId = useId();
  const descriptionId = useId();
  const fileId = useId();
  const errorId = useId();
  const { submitting, error, onSubmit } = useVideoUpload();

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <label className="flex flex-col gap-1 text-sm" htmlFor={titleId}>
        Название
        <input
          id={titleId}
          name="title"
          type="text"
          required
          maxLength={VIDEO_TITLE_MAX_LENGTH}
          disabled={submitting}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm" htmlFor={descriptionId}>
        Описание
        <textarea
          id={descriptionId}
          name="description"
          rows={4}
          maxLength={VIDEO_DESCRIPTION_MAX_LENGTH}
          disabled={submitting}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm" htmlFor={fileId}>
        Файл
        <input
          id={fileId}
          name="file"
          type="file"
          required
          accept={VIDEO_FILE_ACCEPT}
          disabled={submitting}
          className="block w-full cursor-pointer touch-manipulation rounded-lg text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:file:border-zinc-700 dark:file:bg-zinc-950 dark:file:text-zinc-100 dark:hover:file:bg-zinc-800 dark:focus-visible:ring-zinc-100"
        />
      </label>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        MP4 или WebM, не больше 100&nbsp;МБ.
      </p>
      {submitting ? (
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
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 w-fit rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {submitting ? 'Загружаем…' : 'Загрузить'}
      </button>
    </form>
  );
}
