export const TELEGRAM_KEYBOARD_TEXTS = {
  cabinet: 'Кабинет',
  myVideos: 'Мои видео',
  openCabinet: 'Открыть кабинет',
  openVideos: 'Открыть видео',
  howToLink: 'Как привязать аккаунт',
} as const;

export const TELEGRAM_START_LINK_PREFIX = 'link_';

export const TELEGRAM_START_REPLIES = {
  missingId: 'Не удалось определить ваш Telegram id.',
  unlinked:
    'Чтобы привязать Telegram, откройте профиль на сайте и нажмите «Привязать Telegram».',
  alreadyLinked: 'Этот Telegram уже привязан к аккаунту.',
  linkedOk: 'Telegram успешно привязан к аккаунту.',
  expired:
    'Ссылка недействительна или истекла. Создайте новую в профиле на сайте.',
  conflict: 'Этот Telegram уже привязан к другому аккаунту.',
  openCabinetHint:
    'Чтобы войти в кабинет, нажмите кнопку под сообщением. Так Telegram передаст данные для входа.',
  openVideos: 'Откройте раздел видео кнопкой под сообщением.',
} as const;

export function normalizeMiniAppUrl(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return '';
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return '';
    }
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return '';
  }
}
