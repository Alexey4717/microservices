import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

import type { DesktopApi } from '../shared/desktop-api';
import { isDesktopPreferences } from '../shared/desktop-preferences';
import {
  parseOpenTextResult,
  parseSaveReportResult,
} from '../shared/file-payload';
import {
  CLEAR_REFRESH_TOKEN_CHANNEL,
  GET_REFRESH_TOKEN_CHANNEL,
  SET_REFRESH_TOKEN_CHANNEL,
} from '../shared/session-channels';
import {
  CHECK_UPDATE_CHANNEL,
  CRASH_RENDERER_CHANNEL,
  GET_CRASH_STATUS_CHANNEL,
  GET_LOGIN_ITEM_CHANNEL,
  GET_PREFERENCES_CHANNEL,
  GET_UPDATE_STATUS_CHANNEL,
  OPEN_TEXT_FILE_CHANNEL,
  PREFERENCES_CHANGED_CHANNEL,
  SAVE_REPORT_CHANNEL,
  SET_LOGIN_ITEM_CHANNEL,
  SET_MINIMIZE_TO_TRAY_CHANNEL,
  SHOW_ITEM_IN_FOLDER_CHANNEL,
  SHOW_NOTIFICATION_CHANNEL,
} from '../shared/system-channels';
import { parseCrashStatus, parseLoginItemState } from '../shared/system-state';
import { isUpdateStatus } from '../shared/update-channel';

function requireValue<T>(value: T | null, message: string): T {
  if (value === null) {
    throw new Error(message);
  }
  return value;
}

const desktop: DesktopApi = {
  session: {
    getRefreshToken(): Promise<string | null> {
      return ipcRenderer.invoke(GET_REFRESH_TOKEN_CHANNEL);
    },
    setRefreshToken(token: string): Promise<void> {
      return ipcRenderer.invoke(SET_REFRESH_TOKEN_CHANNEL, token);
    },
    clearRefreshToken(): Promise<void> {
      return ipcRenderer.invoke(CLEAR_REFRESH_TOKEN_CHANNEL);
    },
  },
  system: {
    async getPreferences() {
      const value: unknown = await ipcRenderer.invoke(GET_PREFERENCES_CHANNEL);
      return requireValue(
        isDesktopPreferences(value) ? value : null,
        'Некорректный ответ',
      );
    },
    async setMinimizeToTray(enabled: boolean) {
      const value: unknown = await ipcRenderer.invoke(
        SET_MINIMIZE_TO_TRAY_CHANNEL,
        enabled,
      );
      return requireValue(
        isDesktopPreferences(value) ? value : null,
        'Некорректный ответ',
      );
    },
    onPreferencesChanged(listener) {
      const wrapped = (_event: IpcRendererEvent, payload: unknown): void => {
        if (isDesktopPreferences(payload)) {
          listener(payload);
        }
      };
      ipcRenderer.on(PREFERENCES_CHANGED_CHANNEL, wrapped);
      return () => {
        ipcRenderer.removeListener(PREFERENCES_CHANGED_CHANNEL, wrapped);
      };
    },
    async getLoginItem() {
      const value: unknown = await ipcRenderer.invoke(GET_LOGIN_ITEM_CHANNEL);
      return requireValue(parseLoginItemState(value), 'Некорректный ответ');
    },
    async setLoginItem(openAtLogin: boolean) {
      const value: unknown = await ipcRenderer.invoke(
        SET_LOGIN_ITEM_CHANNEL,
        openAtLogin,
      );
      return requireValue(parseLoginItemState(value), 'Некорректный ответ');
    },
    async showNotification() {
      const value: unknown = await ipcRenderer.invoke(
        SHOW_NOTIFICATION_CHANNEL,
      );
      if (typeof value !== 'boolean') {
        throw new Error('Некорректный ответ');
      }
      return value;
    },
    async openTextFile() {
      const value: unknown = await ipcRenderer.invoke(OPEN_TEXT_FILE_CHANNEL);
      if (value === null) {
        return null;
      }
      return requireValue(parseOpenTextResult(value), 'Некорректный ответ');
    },
    async saveReport(text: string) {
      const value: unknown = await ipcRenderer.invoke(
        SAVE_REPORT_CHANNEL,
        text,
      );
      if (value === null) {
        return null;
      }
      return requireValue(parseSaveReportResult(value), 'Некорректный ответ');
    },
    async showItemInFolder(path: string) {
      await ipcRenderer.invoke(SHOW_ITEM_IN_FOLDER_CHANNEL, path);
    },
    async getUpdateStatus() {
      const value: unknown = await ipcRenderer.invoke(
        GET_UPDATE_STATUS_CHANNEL,
      );
      return requireValue(
        isUpdateStatus(value) ? value : null,
        'Некорректный ответ',
      );
    },
    async checkForUpdates() {
      const value: unknown = await ipcRenderer.invoke(CHECK_UPDATE_CHANNEL);
      return requireValue(
        isUpdateStatus(value) ? value : null,
        'Некорректный ответ',
      );
    },
    async getCrashStatus() {
      const value: unknown = await ipcRenderer.invoke(GET_CRASH_STATUS_CHANNEL);
      return requireValue(parseCrashStatus(value), 'Некорректный ответ');
    },
    crashRenderer() {
      return ipcRenderer.invoke(CRASH_RENDERER_CHANNEL);
    },
  },
};

contextBridge.exposeInMainWorld('desktop', desktop);
