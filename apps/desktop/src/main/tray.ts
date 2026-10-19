import { app, Menu, nativeImage, Tray } from 'electron';

import { currentPreferences, setMinimizeToTray } from './preferences-store';
import { trayIconDataUrl } from './tray-icon';
import { getMainWindow, publishPreferences, showMainWindow } from './window';

let tray: Tray | null = null;

export function createAppTray(): void {
  const image = nativeImage.createFromDataURL(trayIconDataUrl());
  if (image.isEmpty()) {
    throw new Error('Пустая иконка трея');
  }

  tray?.destroy();
  tray = new Tray(image);
  tray.setToolTip('Кабинет');
  tray.on('click', () => {
    const win = getMainWindow();
    if (win) {
      showMainWindow(win);
    }
  });
  syncTrayMenu();
}

export function syncTrayMenu(): void {
  if (!tray) {
    return;
  }

  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Показать',
        click: () => {
          const win = getMainWindow();
          if (win) {
            showMainWindow(win);
          }
        },
      },
      {
        label: 'Сворачивать в трей',
        type: 'checkbox',
        checked: currentPreferences().minimizeToTray,
        click: (item) => {
          void commitMinimizeToTray(item.checked).catch((error: unknown) => {
            console.error(error);
            syncTrayMenu();
          });
        },
      },
      {
        label: 'Выйти',
        click: () => {
          app.quit();
        },
      },
    ]),
  );
}

export async function commitMinimizeToTray(
  enabled: boolean,
): Promise<ReturnType<typeof currentPreferences>> {
  const preferences = await setMinimizeToTray(enabled);
  syncTrayMenu();
  publishPreferences(preferences);
  return preferences;
}

export function destroyAppTray(): void {
  tray?.destroy();
  tray = null;
}
