import { app, ipcMain, safeStorage } from 'electron';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  CLEAR_REFRESH_TOKEN_CHANNEL,
  GET_REFRESH_TOKEN_CHANNEL,
  SET_REFRESH_TOKEN_CHANNEL,
} from '../shared/session-channels';

const TOKEN_FILE_NAME = 'refresh-token.bin';

function tokenFilePath(): string {
  return join(app.getPath('userData'), TOKEN_FILE_NAME);
}

function isEnoent(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

export async function readStoredRefreshToken(): Promise<string | null> {
  if (!safeStorage.isEncryptionAvailable()) {
    return null;
  }

  let encrypted: Buffer;
  try {
    encrypted = await readFile(tokenFilePath());
  } catch (error) {
    if (isEnoent(error)) {
      return null;
    }
    throw error;
  }

  if (encrypted.length === 0) {
    return null;
  }

  try {
    const token = safeStorage.decryptString(encrypted);
    return token.length > 0 ? token : null;
  } catch {
    await deleteStoredRefreshToken();
    return null;
  }
}

export async function writeStoredRefreshToken(token: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is unavailable');
  }

  const encrypted = safeStorage.encryptString(token);
  await writeFile(tokenFilePath(), encrypted);
}

export async function deleteStoredRefreshToken(): Promise<void> {
  try {
    await unlink(tokenFilePath());
  } catch (error) {
    if (isEnoent(error)) {
      return;
    }
    throw error;
  }
}

export function registerSessionIpc(): void {
  ipcMain.handle(GET_REFRESH_TOKEN_CHANNEL, () => readStoredRefreshToken());
  ipcMain.handle(SET_REFRESH_TOKEN_CHANNEL, (_event, token: unknown) => {
    if (typeof token !== 'string' || token.length === 0) {
      throw new Error('Refresh token is empty');
    }
    return writeStoredRefreshToken(token);
  });
  ipcMain.handle(CLEAR_REFRESH_TOKEN_CHANNEL, () => deleteStoredRefreshToken());
}
