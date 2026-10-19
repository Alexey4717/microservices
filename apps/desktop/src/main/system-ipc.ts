import {
  app,
  BrowserWindow,
  ipcMain,
  Notification,
  type IpcMainInvokeEvent,
} from 'electron';

import { parseBooleanFlag } from '../shared/system-state';
import {
  CHECK_UPDATE_CHANNEL,
  CRASH_RENDERER_CHANNEL,
  GET_CRASH_STATUS_CHANNEL,
  GET_LOGIN_ITEM_CHANNEL,
  GET_PREFERENCES_CHANNEL,
  GET_UPDATE_STATUS_CHANNEL,
  OPEN_TEXT_FILE_CHANNEL,
  SAVE_REPORT_CHANNEL,
  SET_LOGIN_ITEM_CHANNEL,
  SET_MINIMIZE_TO_TRAY_CHANNEL,
  SHOW_ITEM_IN_FOLDER_CHANNEL,
  SHOW_NOTIFICATION_CHANNEL,
} from '../shared/system-channels';
import { crashRenderer, readCrashStatus } from './crash';
import { openTextFile, revealSavedFile, saveReport } from './files-dialog';
import { assertTrustedIpc } from './ipc-guard';
import { currentPreferences } from './preferences-store';
import { commitMinimizeToTray } from './tray';
import { checkForAppUpdates, readUpdateStatus } from './updates';

export function registerSystemIpc(): void {
  ipcMain.handle(GET_PREFERENCES_CHANNEL, (event) => {
    assertTrustedIpc(event);
    return currentPreferences();
  });

  ipcMain.handle(SET_MINIMIZE_TO_TRAY_CHANNEL, (event, enabled: unknown) => {
    assertTrustedIpc(event);
    const flag = parseBooleanFlag(enabled);
    if (flag === null) {
      throw new Error('Ожидался переключатель');
    }
    return commitMinimizeToTray(flag);
  });

  ipcMain.handle(GET_LOGIN_ITEM_CHANNEL, (event) => {
    assertTrustedIpc(event);
    return readLoginItem();
  });

  ipcMain.handle(SET_LOGIN_ITEM_CHANNEL, (event, openAtLogin: unknown) => {
    assertTrustedIpc(event);
    const flag = parseBooleanFlag(openAtLogin);
    if (flag === null) {
      throw new Error('Ожидался переключатель');
    }
    app.setLoginItemSettings({ openAtLogin: flag });
    return readLoginItem();
  });

  ipcMain.handle(SHOW_NOTIFICATION_CHANNEL, (event) => {
    assertTrustedIpc(event);
    if (!Notification.isSupported()) {
      return false;
    }
    const notification = new Notification({
      title: 'Кабинет',
      body: 'Проверка уведомлений со стенда «Система».',
    });
    notification.show();
    return true;
  });

  ipcMain.handle(OPEN_TEXT_FILE_CHANNEL, (event) => {
    assertTrustedIpc(event);
    return openTextFile(senderWindow(event));
  });

  ipcMain.handle(SAVE_REPORT_CHANNEL, (event, text: unknown) => {
    assertTrustedIpc(event);
    return saveReport(senderWindow(event), text);
  });

  ipcMain.handle(SHOW_ITEM_IN_FOLDER_CHANNEL, (event, filePath: unknown) => {
    assertTrustedIpc(event);
    revealSavedFile(filePath);
  });

  ipcMain.handle(GET_UPDATE_STATUS_CHANNEL, (event) => {
    assertTrustedIpc(event);
    return readUpdateStatus();
  });

  ipcMain.handle(CHECK_UPDATE_CHANNEL, (event) => {
    assertTrustedIpc(event);
    return checkForAppUpdates();
  });

  ipcMain.handle(GET_CRASH_STATUS_CHANNEL, (event) => {
    assertTrustedIpc(event);
    return readCrashStatus();
  });

  ipcMain.handle(CRASH_RENDERER_CHANNEL, (event) => {
    assertTrustedIpc(event);
    crashRenderer(senderWindow(event));
  });
}

function readLoginItem(): { openAtLogin: boolean } {
  return { openAtLogin: app.getLoginItemSettings().openAtLogin };
}

function senderWindow(event: IpcMainInvokeEvent): BrowserWindow {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    throw new Error('Окно не найдено');
  }
  return win;
}
