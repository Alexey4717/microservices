import type { InlineKeyboard, Keyboard } from 'grammy';

export type TelegramBotMessage = {
  text: string;
  replyMarkup?: Keyboard | InlineKeyboard;
};
