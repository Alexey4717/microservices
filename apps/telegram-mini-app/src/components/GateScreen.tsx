import { useEffect } from 'react';

import { signalTelegramReady } from '../telegram';

type GateScreenProps = {
  message: string;
  pending?: boolean;
};

export function GateScreen({ message, pending = false }: GateScreenProps) {
  useEffect(() => {
    signalTelegramReady();
  }, []);

  return (
    <main
      className="gate"
      role="status"
      aria-live="polite"
      aria-busy={pending || undefined}
    >
      <p>{message}</p>
    </main>
  );
}

export const BROWSER_GATE_MESSAGE =
  'Для корректной работы откройте приложение в Telegram';

export const REPLY_KEYBOARD_GATE_MESSAGE =
  'Откройте кабинет кнопкой под сообщением';

export const LOADING_GATE_MESSAGE = 'Загрузка…';
