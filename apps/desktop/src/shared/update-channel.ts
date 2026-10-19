export const UPDATE_STATES = [
  'unconfigured',
  'invalid',
  'unpackaged',
  'idle',
  'available',
  'not-available',
  'error',
] as const;

export type UpdateState = (typeof UPDATE_STATES)[number];

export type UpdateStatus = {
  state: UpdateState;
  version?: string;
};

export type UpdateChannel =
  | { status: 'missing' }
  | { status: 'invalid' }
  | { status: 'ready'; url: string };

export function resolveUpdateChannel(
  configured: string | undefined,
): UpdateChannel {
  const trimmed = configured?.trim() ?? '';
  if (!trimmed) {
    return { status: 'missing' };
  }

  try {
    const url = new URL(trimmed);
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.username ||
      url.password
    ) {
      return { status: 'invalid' };
    }
    return { status: 'ready', url: url.href };
  } catch {
    return { status: 'invalid' };
  }
}

export function sanitizeUpdateVersion(version: string): string | null {
  const trimmed = version.trim();
  if (trimmed.length === 0 || trimmed.length > 64) {
    return null;
  }
  if (!/^[0-9A-Za-z.+-]+$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function isUpdateStatus(value: unknown): value is UpdateStatus {
  if (!isRecord(value) || typeof value.state !== 'string') {
    return false;
  }
  if (!(UPDATE_STATES as readonly string[]).includes(value.state)) {
    return false;
  }
  if (
    'version' in value &&
    value.version !== undefined &&
    typeof value.version !== 'string'
  ) {
    return false;
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
