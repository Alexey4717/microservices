/// <reference types="vite/client" />

import type { DesktopApi } from '../../shared/desktop-api';

declare global {
  interface ImportMetaEnv {
    readonly RENDERER_VITE_GRAPHQL_URL?: string;
  }

  interface Window {
    desktop?: DesktopApi;
  }
}

export {};
