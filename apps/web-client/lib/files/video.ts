/**
 * Лимиты совпадают с `apps/files/src/services/video-validation.ts`.
 * web-client не входит в consumers `@libs/common`, поэтому константы продублированы.
 */
export const VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const VIDEO_TITLE_MAX_LENGTH = 120;
export const VIDEO_DESCRIPTION_MAX_LENGTH = 2000;

export const VIDEO_FILE_ACCEPT = 'video/mp4,video/webm,.mp4,.webm';

const ALLOWED_MIME = new Set(['video/mp4', 'video/webm']);

export type VideoValidationError =
  'title' | 'description' | 'type' | 'size' | 'empty';

export function validateVideoForm(input: {
  title: string;
  description: string;
  file: File | null;
}): VideoValidationError | null {
  const title = input.title.trim();
  if (title.length < 1 || title.length > VIDEO_TITLE_MAX_LENGTH) {
    return 'title';
  }
  if (input.description.trim().length > VIDEO_DESCRIPTION_MAX_LENGTH) {
    return 'description';
  }
  if (!input.file || input.file.size <= 0) {
    return 'empty';
  }
  if (!ALLOWED_MIME.has(input.file.type)) {
    return 'type';
  }
  if (input.file.size > VIDEO_MAX_BYTES) {
    return 'size';
  }
  return null;
}

export function videoValidationMessage(error: VideoValidationError): string {
  switch (error) {
    case 'title':
      return 'Название должно содержать от 1 до 120 символов.';
    case 'description':
      return 'Описание не длиннее 2000 символов.';
    case 'type':
      return 'Поддерживаются только MP4 и WebM.';
    case 'size':
      return 'Файл слишком большой. Максимум 100\u00a0МБ.';
    case 'empty':
      return 'Выберите видеофайл.';
  }
}
