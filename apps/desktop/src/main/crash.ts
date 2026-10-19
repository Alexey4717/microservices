import { app, BrowserWindow, crashReporter } from 'electron';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { CrashStatus } from '../shared/system-state';

let trainingCrashPending = false;
let trainingCrashRemembered = false;

export function startCrashReporter(): void {
  // Дампы остаются в каталоге Crashpad и никуда не отправляются.
  crashReporter.start({
    productName: 'Кабинет',
    uploadToServer: false,
  });
  crashReporter.setUploadToServer(false);
}

export function registerRenderProcessGone(): void {
  app.on('render-process-gone', (_event, webContents, details) => {
    if (details.reason === 'clean-exit' || !trainingCrashPending) {
      return;
    }
    trainingCrashPending = false;
    trainingCrashRemembered = true;
    const win = BrowserWindow.fromWebContents(webContents);
    if (!win || win.isDestroyed() || webContents.isDestroyed()) {
      return;
    }
    try {
      webContents.reload();
    } catch (error) {
      console.error(error);
    }
  });
}

export function crashRenderer(win: BrowserWindow): void {
  trainingCrashPending = true;
  win.webContents.forcefullyCrashRenderer();
}

export function readCrashStatus(): CrashStatus {
  return {
    dumpDirectory: crashDumpDirectory(),
    hadTrainingCrash: trainingCrashRemembered,
  };
}

function crashDumpDirectory(): string {
  const root = app.getPath('crashDumps');
  const crashpad = join(root, 'Crashpad');
  return existsSync(crashpad) ? crashpad : root;
}
