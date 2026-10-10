'use client';

import { useRouter } from 'next/navigation';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';

import { UploadAvatarDocument } from '@libs/graphql/operations/user/upload-avatar.generated';

import { rememberSessionUser } from '@/lib/auth/actions';
import type { AuthUser } from '@/lib/auth/auth-user';
import { publishClientUser } from '@/lib/auth/client-user';
import {
  avatarValidationMessage,
  validateAvatarFile,
} from '@/lib/files/avatar';
import { uploadAvatarMultipart } from '@/lib/graphql/multipart-upload';

export function useAvatarUpload(accessToken: string, user: AuthUser) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  function clearObjectUrl() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setObjectUrl(null);
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setStatus(null);

    if (!file) {
      return;
    }

    const validation = validateAvatarFile(file);
    if (validation) {
      clearObjectUrl();
      setError(avatarValidationMessage(validation));
      inputRef.current?.focus();
      return;
    }

    const nextObjectUrl = URL.createObjectURL(file);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = nextObjectUrl;
    setObjectUrl(nextObjectUrl);
    setError(null);
    setUploading(true);

    try {
      const nextUser = await uploadAvatarMultipart({
        document: UploadAvatarDocument,
        file,
        accessToken,
      });
      clearObjectUrl();
      setUploadedUrl(nextUser.avatarUrl ?? null);
      setStatus('Аватар обновлён');
      publishClientUser(nextUser);
      await rememberSessionUser(nextUser);
      router.refresh();
    } catch (uploadError) {
      clearObjectUrl();
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Не удалось загрузить аватар. Попробуйте ещё раз.',
      );
      inputRef.current?.focus();
    } finally {
      setUploading(false);
    }
  }

  const displayUrl = objectUrl ?? uploadedUrl ?? user.avatarUrl ?? null;
  const displayName = user.name?.trim() || user.email;

  return {
    inputRef,
    displayUrl,
    displayName,
    uploading,
    error,
    status,
    onFileChange,
  };
}
