/// <reference types="vite/client" />

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
