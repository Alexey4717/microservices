export const NAVIGATION_PATHS = [
  '/',
  '/profile',
  '/payments',
  '/videos',
  '/ai-assistant',
] as const;

export type NavigationPath = (typeof NAVIGATION_PATHS)[number];

export const CHECKOUT_PROVIDERS = ['STRIPE', 'PAYPAL'] as const;

export type CheckoutProvider = (typeof CHECKOUT_PROVIDERS)[number];

export const DEFAULT_PRODUCT_CODE = 'PREMIUM';

const APP_PREFIXES = ['/profile', '/payments', '/videos', '/ai-assistant'];

const PATH_LABELS: Record<NavigationPath, string> = {
  '/': 'Главная',
  '/profile': 'Профиль',
  '/payments': 'Платежи',
  '/videos': 'Видео',
  '/ai-assistant': 'ИИ-ассистент',
};

export type ProposeSuccess<T> = { ok: true } & T;
export type ProposeFailure = { ok: false; error: string };
export type ProposeResult<T> = ProposeSuccess<T> | ProposeFailure;

export function parseProposeCheckout(
  args: unknown,
): ProposeResult<{ provider: CheckoutProvider; productCode: string }> {
  const record = asRecord(args);
  const providerRaw =
    typeof record.provider === 'string'
      ? record.provider.trim().toUpperCase()
      : '';
  if (!isCheckoutProvider(providerRaw)) {
    return {
      ok: false,
      error: 'Провайдер должен быть STRIPE или PAYPAL',
    };
  }

  const productRaw =
    typeof record.productCode === 'string'
      ? record.productCode.trim().toUpperCase()
      : '';
  const productCode = productRaw || DEFAULT_PRODUCT_CODE;
  if (productCode !== DEFAULT_PRODUCT_CODE) {
    return { ok: false, error: 'Доступен только продукт PREMIUM' };
  }

  return { ok: true, provider: providerRaw, productCode };
}

export function parseProposeNavigation(
  args: unknown,
): ProposeResult<{ path: NavigationPath }> {
  const record = asRecord(args);
  const path = sanitizePath(typeof record.path === 'string' ? record.path : '');
  if (!path || !isNavigationPath(path)) {
    return {
      ok: false,
      error:
        'Можно перейти только на /, /profile, /payments, /videos или /ai-assistant',
    };
  }
  return { ok: true, path };
}

export function parseProposeUpdateName(
  args: unknown,
): ProposeResult<{ name: string }> {
  const record = asRecord(args);
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  if (!name) {
    return { ok: false, error: 'Имя не должно быть пустым' };
  }
  return { ok: true, name };
}

export function isNavigationPath(path: string): path is NavigationPath {
  return (NAVIGATION_PATHS as readonly string[]).includes(path);
}

export function normalizeAppPagePath(
  raw: string | null | undefined,
): string | null {
  const path = sanitizePath(raw);
  if (!path) {
    return null;
  }
  if (path === '/') {
    return path;
  }
  const allowed = APP_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
  return allowed ? path : null;
}

export function checkoutTitle(
  provider: CheckoutProvider,
  productCode: string,
): string {
  const providerLabel = provider === 'PAYPAL' ? 'PayPal' : 'Stripe';
  return `Оплатить ${productCode} через ${providerLabel}`;
}

export function navigationTitle(path: NavigationPath): string {
  return `Перейти: ${PATH_LABELS[path]}`;
}

export function updateNameTitle(name: string): string {
  return `Сменить имя на «${name}»`;
}

export function readActionTitle(payload: unknown, type: string): string {
  if (payload && typeof payload === 'object' && 'title' in payload) {
    const title = (payload as { title?: unknown }).title;
    if (typeof title === 'string' && title.trim()) {
      return title.trim();
    }
  }
  return type;
}

function asRecord(args: unknown): Record<string, unknown> {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    return {};
  }
  return args as Record<string, unknown>;
}

function isCheckoutProvider(value: string): value is CheckoutProvider {
  return (CHECKOUT_PROVIDERS as readonly string[]).includes(value);
}

function sanitizePath(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return null;
  }
  if (
    trimmed.includes('://') ||
    trimmed.includes('\\') ||
    trimmed.includes('?') ||
    trimmed.includes('#') ||
    trimmed.includes('%')
  ) {
    return null;
  }
  const path =
    trimmed.length > 1 && trimmed.endsWith('/')
      ? trimmed.slice(0, -1)
      : trimmed;
  if (path.split('/').some((part) => part === '..' || part === '.')) {
    return null;
  }
  return path;
}
