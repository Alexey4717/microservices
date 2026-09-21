type TelegramThemeParams = {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
  section_separator_color?: string;
  bottom_bar_bg_color?: string;
};

type TelegramInset = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

type TelegramBackButton = {
  show: () => void;
  hide: () => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
};

export type TelegramWebApp = {
  initData: string;
  initDataUnsafe: {
    start_param?: string;
    user?: { id: number };
  };
  platform: string;
  themeParams: TelegramThemeParams;
  safeAreaInset?: TelegramInset;
  contentSafeAreaInset?: TelegramInset;
  BackButton: TelegramBackButton;
  ready: () => void;
  expand: () => void;
  onEvent: (event: string, callback: () => void) => void;
  offEvent: (event: string, callback: () => void) => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

const THEME_VARS: Array<[keyof TelegramThemeParams, string, string]> = [
  ['bg_color', '--tg-theme-bg-color', '#ffffff'],
  ['text_color', '--tg-theme-text-color', '#111111'],
  ['hint_color', '--tg-theme-hint-color', '#8e8e93'],
  ['link_color', '--tg-theme-link-color', '#2481cc'],
  ['button_color', '--tg-theme-button-color', '#2481cc'],
  ['button_text_color', '--tg-theme-button-text-color', '#ffffff'],
  ['secondary_bg_color', '--tg-theme-secondary-bg-color', '#efeff4'],
  ['header_bg_color', '--tg-theme-header-bg-color', '#ffffff'],
  ['accent_text_color', '--tg-theme-accent-text-color', '#2481cc'],
  ['section_bg_color', '--tg-theme-section-bg-color', '#ffffff'],
  [
    'section_header_text_color',
    '--tg-theme-section-header-text-color',
    '#6d6d72',
  ],
  ['subtitle_text_color', '--tg-theme-subtitle-text-color', '#8e8e93'],
  ['destructive_text_color', '--tg-theme-destructive-text-color', '#ff3b30'],
  ['section_separator_color', '--tg-theme-section-separator-color', '#c8c7cc'],
  ['bottom_bar_bg_color', '--tg-theme-bottom-bar-bg-color', '#f7f7f8'],
];

const TG_WEBAPP_DATA_PREFIX = 'tgWebAppData=';
const NEXT_TG_WEBAPP_KEY = /&tgWebApp[A-Z]/;

export function getTelegramWebApp(): TelegramWebApp | undefined {
  return window.Telegram?.WebApp;
}

export function signalTelegramReady(): void {
  getTelegramWebApp()?.ready();
}

export function parseInitDataFromLocationHash(hash: string): string {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) {
    return '';
  }

  const start = raw.indexOf(TG_WEBAPP_DATA_PREFIX);
  if (start === -1) {
    return '';
  }
  const rest = raw.slice(start + TG_WEBAPP_DATA_PREFIX.length);
  const nextKey = rest.search(NEXT_TG_WEBAPP_KEY);
  const value = nextKey === -1 ? rest : rest.slice(0, nextKey);
  try {
    return decodeURIComponent(value.replace(/\+/g, ' ')).trim();
  } catch {
    return value.trim();
  }
}

export function parseStartParamFromLocationHash(hash: string): string {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) {
    return '';
  }
  return new URLSearchParams(raw).get('tgWebAppStartParam')?.trim() ?? '';
}

export function getInitData(): string {
  const fromSdk = getTelegramWebApp()?.initData?.trim();
  if (fromSdk) {
    return fromSdk;
  }
  if (typeof window === 'undefined') {
    return '';
  }
  return parseInitDataFromLocationHash(window.location.hash);
}

export function isTelegramClient(): boolean {
  const platform = getTelegramWebApp()?.platform;
  if (platform && platform !== 'unknown') {
    return true;
  }
  return /Telegram/i.test(navigator.userAgent);
}

export function getStartParam(): string {
  const fromUnsafe = getTelegramWebApp()?.initDataUnsafe?.start_param?.trim();
  if (fromUnsafe) {
    return fromUnsafe;
  }

  const initData = getInitData();
  if (initData) {
    const fromInit = new URLSearchParams(initData).get('start_param')?.trim();
    if (fromInit) {
      return fromInit;
    }
  }

  if (typeof window === 'undefined') {
    return '';
  }
  const fromQuery = new URLSearchParams(window.location.search)
    .get('tgWebAppStartParam')
    ?.trim();
  if (fromQuery) {
    return fromQuery;
  }
  return parseStartParamFromLocationHash(window.location.hash);
}

export function miniAppInitialPath(startParam = getStartParam()): string {
  return startParam === 'videos' ? '/videos' : '/';
}

export function isAndroidLowPerf(userAgent = navigator.userAgent): boolean {
  if (!/Telegram-Android/i.test(userAgent)) {
    return false;
  }
  return /;\s*LOW(?:\s*[;)]|$)/i.test(userAgent);
}

function applyInsets(webApp: TelegramWebApp): void {
  const root = document.documentElement;
  const safe = webApp.safeAreaInset ?? {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  };
  const content = webApp.contentSafeAreaInset ?? {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  };

  root.style.setProperty('--tg-safe-area-inset-top', `${safe.top}px`);
  root.style.setProperty('--tg-safe-area-inset-bottom', `${safe.bottom}px`);
  root.style.setProperty('--tg-safe-area-inset-left', `${safe.left}px`);
  root.style.setProperty('--tg-safe-area-inset-right', `${safe.right}px`);
  root.style.setProperty(
    '--tg-content-safe-area-inset-top',
    `${content.top}px`,
  );
  root.style.setProperty(
    '--tg-content-safe-area-inset-bottom',
    `${content.bottom}px`,
  );
  root.style.setProperty(
    '--tg-content-safe-area-inset-left',
    `${content.left}px`,
  );
  root.style.setProperty(
    '--tg-content-safe-area-inset-right',
    `${content.right}px`,
  );
}

function applyThemeParams(webApp: TelegramWebApp): void {
  const root = document.documentElement;
  for (const [key, cssVar, fallback] of THEME_VARS) {
    const value = webApp.themeParams[key]?.trim();
    root.style.setProperty(cssVar, value || fallback);
  }
  applyInsets(webApp);
}

export function bootstrapTelegram(): TelegramWebApp | undefined {
  const webApp = getTelegramWebApp();
  if (isAndroidLowPerf()) {
    document.documentElement.dataset.perf = 'low';
  }

  signalTelegramReady();
  if (!webApp) {
    return undefined;
  }

  webApp.expand();
  applyThemeParams(webApp);

  const syncTheme = () => applyThemeParams(webApp);
  webApp.onEvent('themeChanged', syncTheme);
  webApp.onEvent('safeAreaChanged', syncTheme);
  webApp.onEvent('contentSafeAreaChanged', syncTheme);
  return webApp;
}
