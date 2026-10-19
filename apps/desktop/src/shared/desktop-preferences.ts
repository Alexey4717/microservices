export type DesktopPreferences = {
  minimizeToTray: boolean;
};

export const DEFAULT_DESKTOP_PREFERENCES: DesktopPreferences = {
  minimizeToTray: false,
};

export function parseDesktopPreferences(value: unknown): DesktopPreferences {
  const decoded = typeof value === 'string' ? parseJson(value) : value;
  if (!isRecord(decoded) || decoded.minimizeToTray !== true) {
    return { minimizeToTray: false };
  }
  return { minimizeToTray: true };
}

export function isDesktopPreferences(
  value: unknown,
): value is DesktopPreferences {
  return (
    isRecord(value) &&
    'minimizeToTray' in value &&
    typeof value.minimizeToTray === 'boolean'
  );
}

export function serializeDesktopPreferences(
  preferences: DesktopPreferences,
): string {
  return `${JSON.stringify({ minimizeToTray: preferences.minimizeToTray === true }, null, 2)}\n`;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
