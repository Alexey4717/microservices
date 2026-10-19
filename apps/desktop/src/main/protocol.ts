import { app } from 'electron';
import { resolve } from 'node:path';

import { CABINET_PROTOCOL, devProtocolScript } from '../shared/cabinet-url';

export function registerProtocolClient(): void {
  // Регистрация пишет ключ текущего пользователя — это ожидаемо.
  const scriptArg = devProtocolScript(
    Boolean(process.defaultApp) || !app.isPackaged,
    process.argv[1],
  );
  const registered = scriptArg
    ? app.setAsDefaultProtocolClient(CABINET_PROTOCOL, process.execPath, [
        resolve(scriptArg),
      ])
    : app.setAsDefaultProtocolClient(CABINET_PROTOCOL);

  if (!registered) {
    console.error('Не удалось зарегистрировать протокол cabinet');
  }
}
