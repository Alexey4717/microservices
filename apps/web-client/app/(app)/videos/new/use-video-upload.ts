'use client';

import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { useMutation } from '@apollo/client/react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { CompleteVideoUploadDocument } from '@libs/graphql/operations/videos/complete-video-upload.generated';
import { CreateVideoUploadDocument } from '@libs/graphql/operations/videos/create-video-upload.generated';

import { validateVideoForm, videoValidationMessage } from '@/lib/files/video';

export function useVideoUpload() {
  const router = useRouter();
  const [createUpload] = useMutation(CreateVideoUploadDocument);
  const [completeUpload] = useMutation(CompleteVideoUploadDocument);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const form = event.currentTarget;
    const data = new FormData(form);
    const title = String(data.get('title') ?? '');
    const description = String(data.get('description') ?? '');
    const fileField = form.elements.namedItem('file');
    const file =
      fileField instanceof HTMLInputElement
        ? (fileField.files?.[0] ?? null)
        : null;
    const validation = validateVideoForm({ title, description, file });
    if (validation || !file) {
      setError(videoValidationMessage(validation ?? 'empty'));
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const created = await createUpload({
        variables: {
          input: {
            title: title.trim(),
            description: description.trim(),
            filename: file.name || 'video',
            mimeType: file.type,
            size: file.size,
          },
        },
      });
      const upload = created.data?.createVideoUpload;
      if (!upload?.videoId || !upload.uploadUrl) {
        throw new Error('Не удалось подготовить загрузку.');
      }

      const response = await fetch(upload.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!response.ok) {
        throw new Error('Не удалось загрузить файл. Попробуйте ещё раз.');
      }

      const completed = await completeUpload({
        variables: { id: upload.videoId },
      });
      if (!completed.data?.completeVideoUpload.id) {
        throw new Error('Не удалось подтвердить загрузку. Попробуйте ещё раз.');
      }

      router.push(`/videos/${upload.videoId}`);
    } catch (uploadError) {
      setError(messageFromUnknown(uploadError));
      setSubmitting(false);
    }
  }

  return { submitting, error, onSubmit };
}

function messageFromUnknown(error: unknown): string {
  if (CombinedGraphQLErrors.is(error)) {
    const message = error.errors[0]?.message?.trim();
    if (message) {
      return message;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return 'Не удалось загрузить видео. Попробуйте ещё раз.';
}
