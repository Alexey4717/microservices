/// <reference types="electron-vite/node" />
import { app, BrowserWindow, session } from 'electron';
import { join } from 'node:path';

import { resolveGraphqlUrl } from '../shared/graphql-url';
import { registerSessionIpc } from './session-store';

const PACKAGED_CORS_HEADERS = [
  'Authorization',
  'Content-Type',
  'Apollo-Require-Preflight',
  'Accept',
].join(', ');

function installPackagedGraphqlCors(): void {
  if (process.env.ELECTRON_RENDERER_URL) {
    return;
  }

  const graphqlUrl = resolveGraphqlUrl(import.meta.env.MAIN_VITE_GRAPHQL_URL);
  let origin: string;
  try {
    origin = new URL(graphqlUrl).origin;
  } catch (error) {
    console.error(error);
    return;
  }

  session.defaultSession.webRequest.onHeadersReceived(
    { urls: [`${origin}/*`] },
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Access-Control-Allow-Origin': ['*'],
          'Access-Control-Allow-Headers': [PACKAGED_CORS_HEADERS],
          'Access-Control-Allow-Methods': ['GET, POST, OPTIONS'],
        },
      });
    },
  );
}

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
  installPackagedGraphqlCors();
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
