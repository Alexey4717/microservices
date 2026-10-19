/// <reference types="electron-vite/node" />
import { app, session } from 'electron';

import {
  cabinetRouteFromArgv,
  parseCabinetUrl,
  type AppRoute,
} from '../shared/cabinet-url';
import { resolveGraphqlUrl } from '../shared/graphql-url';
import { installPackagedContentSecurityPolicy } from './content-security';
import { registerRenderProcessGone, startCrashReporter } from './crash';
import { loadDesktopPreferences } from './preferences-store';
import { registerProtocolClient } from './protocol';
import { registerSessionIpc } from './session-store';
import { registerSystemIpc } from './system-ipc';
import { createAppTray, destroyAppTray } from './tray';
import { markQuitting } from './lifecycle';
import {
  createMainWindow,
  getMainWindow,
  navigateMainWindow,
  showMainWindow,
} from './window';

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

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  startCrashReporter();
  registerProtocolClient();
  app.setAppUserModelId('pet.microservices.desktop');

  let launchRoute: AppRoute | null = cabinetRouteFromArgv(process.argv);

  const openRoute = (route: AppRoute | null): void => {
    const win = getMainWindow();
    if (!win) {
      if (route) {
        launchRoute = route;
      }
      return;
    }
    showMainWindow(win);
    if (!route) {
      return;
    }
    launchRoute = null;
    navigateMainWindow(win, route);
  };

  app.on('second-instance', (_event, argv) => {
    openRoute(cabinetRouteFromArgv(argv));
  });

  app.on('open-url', (event, url) => {
    event.preventDefault();
    openRoute(parseCabinetUrl(url));
  });

  void app
    .whenReady()
    .then(async () => {
      registerRenderProcessGone();
      await loadDesktopPreferences();
      registerSessionIpc();
      registerSystemIpc();
      installPackagedGraphqlCors();
      installPackagedContentSecurityPolicy();

      const win = createMainWindow();
      try {
        createAppTray();
      } catch (error) {
        console.error(error);
      }

      const route = launchRoute;
      launchRoute = null;
      if (route) {
        navigateMainWindow(win, route);
      }

      app.on('activate', () => {
        const current = getMainWindow();
        if (!current) {
          createMainWindow();
          return;
        }
        showMainWindow(current);
      });
    })
    .catch((error: unknown) => {
      console.error(error);
    });

  app.on('before-quit', () => {
    markQuitting();
    destroyAppTray();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
