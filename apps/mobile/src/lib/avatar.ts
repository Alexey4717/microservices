export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export const AVATAR_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type AvatarMimeType = (typeof AVATAR_ALLOWED_MIME_TYPES)[number];

const ALLOWED_MIME = new Set<string>(AVATAR_ALLOWED_MIME_TYPES);

export type AvatarValidationError = 'type' | 'size' | 'unknown-size';

export type AvatarUploadFile = {
  uri: string;
  name: string;
  type: string;
};

export function validateAvatarFile(input: {
  type: string;
  size: number | null;
}): AvatarValidationError | null {
  if (!ALLOWED_MIME.has(input.type)) {
    return 'type';
  }
  if (input.size == null) {
    return 'unknown-size';
  }
  if (input.size > AVATAR_MAX_BYTES) {
    return 'size';
  }
  return null;
}

export function avatarValidationMessage(error: AvatarValidationError): string {
  if (error === 'type') {
    return 'Неподдерживаемый тип файла. Выберите JPEG, PNG, WebP или GIF.';
  }
  if (error === 'unknown-size') {
    return 'Не удалось проверить размер файла. Выберите другое изображение.';
  }
  return 'Файл слишком большой. Максимум 2\u00a0МБ.';
}

export function normalizeAvatarMime(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized === 'image/jpg' || normalized === 'image/pjpeg') {
    return 'image/jpeg';
  }
  return normalized;
}

export function mimeFromFileName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('.png')) {
    return 'image/png';
  }
  if (lower.endsWith('.webp')) {
    return 'image/webp';
  }
  if (lower.endsWith('.gif')) {
    return 'image/gif';
  }
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  return '';
}
