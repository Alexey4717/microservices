import { app } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  parseDesktopPreferences,
  serializeDesktopPreferences,
  type DesktopPreferences,
} from '../shared/desktop-preferences';

const PREFERENCES_FILE_NAME = 'window-preferences.json';

let cache: DesktopPreferences = { minimizeToTray: false };

function preferencesPath(): string {
  return join(app.getPath('userData'), PREFERENCES_FILE_NAME);
}

function isEnoent(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

export function currentPreferences(): DesktopPreferences {
  return cache;
}

export async function loadDesktopPreferences(): Promise<DesktopPreferences> {
  try {
    const raw = await readFile(preferencesPath(), 'utf8');
    cache = parseDesktopPreferences(raw);
  } catch (error) {
    if (!isEnoent(error)) {
      console.error(error);
    }
    cache = { minimizeToTray: false };
  }
  return cache;
}

export async function setMinimizeToTray(
  enabled: boolean,
): Promise<DesktopPreferences> {
  const next: DesktopPreferences = { minimizeToTray: enabled };
  await writeFile(preferencesPath(), serializeDesktopPreferences(next), 'utf8');
  cache = next;
  return cache;
}
