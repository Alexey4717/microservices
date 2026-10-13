export type FocusedEntity = {
  type: 'video';
  id: string;
};

const VIDEO_PAGE_PATH =
  /^\/videos\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function parseFocusedEntity(
  pagePath: string | null | undefined,
): FocusedEntity | null {
  const path = pagePath?.trim() ?? '';
  if (!path) {
    return null;
  }
  const match = VIDEO_PAGE_PATH.exec(path);
  const id = match?.[1];
  if (!id) {
    return null;
  }
  return { type: 'video', id };
}

export function videoIdFromPagePath(
  pagePath: string | null | undefined,
): string | null {
  return parseFocusedEntity(pagePath)?.id ?? null;
}

export type FocusedVideoSnapshot = {
  id: string;
  title: string;
  description: string;
  url: string;
  ownerUserId: string;
  createdAt: string;
};

export function formatFocusedVideoPrompt(
  video: FocusedVideoSnapshot | null,
): string {
  if (!video) {
    return 'Сейчас на экране видео, но сущность недоступна. Не выдумывай title, description и другие поля.';
  }

  const lines = [
    'Сейчас на экране видео (live-снимок из сервиса files):',
    `id: ${video.id}`,
    `title: ${video.title}`,
    `description: ${video.description || '(пусто)'}`,
    `url: ${video.url}`,
    `ownerUserId: ${video.ownerUserId}`,
    `createdAt: ${video.createdAt}`,
  ];
  return lines.join('\n');
}
