/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly RENDERER_VITE_GRAPHQL_URL?: string;
}

interface DesktopSessionApi {
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string): Promise<void>;
  clearRefreshToken(): Promise<void>;
}

interface DesktopApi {
  session: DesktopSessionApi;
}

interface Window {
  desktop?: DesktopApi;
}
