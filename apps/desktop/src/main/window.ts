import { BrowserWindow, shell } from 'electron';
import { join } from 'node:path';

import { navigationScript, type AppRoute } from '../shared/cabinet-url';
import { classifyNavigation } from '../shared/navigation-policy';
import { PREFERENCES_CHANGED_CHANNEL } from '../shared/system-channels';
import type { DesktopPreferences } from '../shared/desktop-preferences';
import { packagedIndexUrl } from './ipc-guard';
import { isQuitting } from './lifecycle';
import { currentPreferences } from './preferences-store';

let mainWindow: BrowserWindow | null = null;
const pendingRoutes = new Map<number, AppRoute>();
const loadListeners = new Set<number>();

export function getMainWindow(): BrowserWindow | null {
  if (mainWindow?.isDestroyed()) {
    mainWindow = null;
  }
  return mainWindow;
}

export function showMainWindow(win: BrowserWindow): void {
  if (win.isDestroyed()) {
    return;
  }
  if (win.isMinimized()) {
    win.restore();
  }
  win.show();
  win.focus();
}

export function navigateMainWindow(win: BrowserWindow, route: AppRoute): void {
  pendingRoutes.set(win.id, route);
  const apply = () => {
    loadListeners.delete(win.id);
    const next = pendingRoutes.get(win.id);
    pendingRoutes.delete(win.id);
    if (!next || win.isDestroyed() || win.webContents.isDestroyed()) {
      return;
    }
    void win.webContents
      .executeJavaScript(navigationScript(next))
      .catch((error: unknown) => {
        console.error(error);
      });
  };

  if (win.webContents.isLoading() || win.webContents.getURL().length === 0) {
    if (!loadListeners.has(win.id)) {
      loadListeners.add(win.id);
      win.webContents.once('did-finish-load', apply);
    }
    return;
  }

  apply();
}

export function publishPreferences(preferences: DesktopPreferences): void {
  const win = getMainWindow();
  if (!win || win.webContents.isDestroyed()) {
    return;
  }
  win.webContents.send(PREFERENCES_CHANGED_CHANNEL, preferences);
}

export function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
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

  mainWindow = win;
  attachNavigationGuards(win);

  win.on('close', (event) => {
    if (isQuitting() || !currentPreferences().minimizeToTray) {
      return;
    }
    event.preventDefault();
    win.hide();
  });

  win.on('closed', () => {
    pendingRoutes.delete(win.id);
    loadListeners.delete(win.id);
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  const loaded = rendererUrl
    ? win.loadURL(rendererUrl)
    : win.loadFile(join(__dirname, '../renderer/index.html'));

  loaded.catch((error: unknown) => {
    console.error(error);
  });

  return win;
}

function attachNavigationGuards(win: BrowserWindow): void {
  const packagedUrl = packagedIndexUrl();

  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalIfNeeded(classifyNavigation(url, packagedUrl));
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const decision = classifyNavigation(url, packagedUrl);
    if (decision.action === 'allow') {
      return;
    }
    event.preventDefault();
    openExternalIfNeeded(decision);
  });
}

function openExternalIfNeeded(
  decision: ReturnType<typeof classifyNavigation>,
): void {
  if (decision.action !== 'external') {
    return;
  }
  void shell.openExternal(decision.url).catch((error: unknown) => {
    console.error(error);
  });
}
