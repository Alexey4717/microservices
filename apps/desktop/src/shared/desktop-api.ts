import type { DesktopPreferences } from './desktop-preferences';
import type { OpenTextResult, SaveReportResult } from './file-payload';
import type { CrashStatus, LoginItemState } from './system-state';
import type { UpdateStatus } from './update-channel';

export type DesktopSessionApi = {
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string): Promise<void>;
  clearRefreshToken(): Promise<void>;
};

export type DesktopSystemApi = {
  getPreferences(): Promise<DesktopPreferences>;
  setMinimizeToTray(enabled: boolean): Promise<DesktopPreferences>;
  onPreferencesChanged(
    listener: (preferences: DesktopPreferences) => void,
  ): () => void;
  getLoginItem(): Promise<LoginItemState>;
  setLoginItem(openAtLogin: boolean): Promise<LoginItemState>;
  showNotification(): Promise<boolean>;
  openTextFile(): Promise<OpenTextResult | null>;
  saveReport(text: string): Promise<SaveReportResult | null>;
  showItemInFolder(path: string): Promise<void>;
  getUpdateStatus(): Promise<UpdateStatus>;
  checkForUpdates(): Promise<UpdateStatus>;
  getCrashStatus(): Promise<CrashStatus>;
  crashRenderer(): Promise<void>;
};

export type DesktopApi = {
  session: DesktopSessionApi;
  system: DesktopSystemApi;
};
