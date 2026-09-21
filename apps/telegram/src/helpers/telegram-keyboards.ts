import { InlineKeyboard, Keyboard } from 'grammy';

import {
  TELEGRAM_KEYBOARD_TEXTS,
  normalizeMiniAppUrl,
} from '../helpers/telegram-mini-app';

export function linkedReplyKeyboard(miniAppUrl: string): Keyboard {
  const url = normalizeMiniAppUrl(miniAppUrl);
  return new Keyboard()
    .webApp(TELEGRAM_KEYBOARD_TEXTS.cabinet, url)
    .text(TELEGRAM_KEYBOARD_TEXTS.myVideos)
    .resized();
}

export function openCabinetInlineKeyboard(miniAppUrl: string): InlineKeyboard {
  const url = normalizeMiniAppUrl(miniAppUrl);
  return new InlineKeyboard().webApp(TELEGRAM_KEYBOARD_TEXTS.openCabinet, url);
}

export function openVideosInlineKeyboard(miniAppUrl: string): InlineKeyboard {
  const url = normalizeMiniAppUrl(miniAppUrl);
  return new InlineKeyboard().webApp(
    TELEGRAM_KEYBOARD_TEXTS.openVideos,
    `${url}/videos`,
  );
}

export function unlinkedReplyKeyboard(): Keyboard {
  return new Keyboard().text(TELEGRAM_KEYBOARD_TEXTS.howToLink).resized();
}
