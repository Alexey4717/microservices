import { app } from 'electron';
import { autoUpdater } from 'electron-updater';

import {
  resolveUpdateChannel,
  sanitizeUpdateVersion,
  type UpdateStatus,
} from '../shared/update-channel';

let lastCheck: UpdateStatus | null = null;

function blockedStatus(): UpdateStatus | null {
  const channel = resolveUpdateChannel(import.meta.env.MAIN_VITE_UPDATE_URL);
  if (channel.status === 'missing') {
    return { state: 'unconfigured' };
  }
  if (channel.status === 'invalid') {
    return { state: 'invalid' };
  }
  if (!app.isPackaged) {
    return { state: 'unpackaged' };
  }
  return null;
}

export function readUpdateStatus(): UpdateStatus {
  return blockedStatus() ?? lastCheck ?? { state: 'idle' };
}

export async function checkForAppUpdates(): Promise<UpdateStatus> {
  const blocked = blockedStatus();
  if (blocked) {
    return blocked;
  }

  const channel = resolveUpdateChannel(import.meta.env.MAIN_VITE_UPDATE_URL);
  if (channel.status !== 'ready') {
    return { state: 'unconfigured' };
  }

  try {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.logger = null;
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: channel.url,
    });
    const result = await autoUpdater.checkForUpdates();
    const version = result?.updateInfo.version
      ? sanitizeUpdateVersion(result.updateInfo.version)
      : null;
    const status: UpdateStatus =
      result?.isUpdateAvailable === true
        ? { state: 'available', ...(version ? { version } : {}) }
        : { state: 'not-available' };
    lastCheck = status;
    return status;
  } catch (error) {
    console.error(error);
    const status: UpdateStatus = { state: 'error' };
    lastCheck = status;
    return status;
  }
}
