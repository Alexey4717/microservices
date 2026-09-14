/**
 * MUST match `libs/common/src/avatar.ts`.
 * `apps/web-client` cannot import `@libs/*`.
 */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export const AVATAR_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type AvatarMimeType = (typeof AVATAR_ALLOWED_MIME_TYPES)[number];

export const AVATAR_FILE_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif';

const ALLOWED_MIME = new Set<string>(AVATAR_ALLOWED_MIME_TYPES);

export type AvatarValidationError = 'type' | 'size';

export function validateAvatarFile(file: File): AvatarValidationError | null {
  if (!ALLOWED_MIME.has(file.type)) {
    return 'type';
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return 'size';
  }
  return null;
}

export function avatarValidationMessage(error: AvatarValidationError): string {
  if (error === 'type') {
    return 'Неподдерживаемый тип файла. Выберите JPEG, PNG, WebP или GIF.';
  }
  return 'Файл слишком большой. Максимум 2\u00a0МБ.';
}
