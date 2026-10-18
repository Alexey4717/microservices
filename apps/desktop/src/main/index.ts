/// <reference types="electron-vite/node" />
import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';

import { registerSessionIpc } from './session-store';

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 960,
    height: 640,
    minWidth: 420,
    minHeight: 520,
    show: false,
    title: 'Кабинет',
    autoHideMenuBar: true,
    backgroundColor: '#f4f4f5',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  const loaded = rendererUrl
    ? mainWindow.loadURL(rendererUrl)
    : mainWindow.loadFile(join(__dirname, '../renderer/index.html'));

  loaded.catch((error: unknown) => {
    console.error(error);
  });
}

void app.whenReady().then(() => {
  registerSessionIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
