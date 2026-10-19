export const TEXT_PREVIEW_CHARS = 400;

export const TEXT_SAMPLE_BYTES = 8192;

export const REPORT_TEXT_MAX = 65_536;

export type TextPreview = {
  text: string;
  truncated: boolean;
};

export type OpenTextResult = {
  path: string;
  preview: string;
  truncated: boolean;
};

export type SaveReportResult = {
  path: string;
};

export function previewText(
  content: string,
  limit = TEXT_PREVIEW_CHARS,
): TextPreview {
  const normalized = content.replace(/^\uFEFF/, '');
  if (normalized.length <= limit) {
    return { text: normalized, truncated: false };
  }
  return { text: normalized.slice(0, limit), truncated: true };
}

export function containsNullByte(bytes: Uint8Array): boolean {
  return bytes.includes(0);
}

export function parseReportText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  if (
    value.length === 0 ||
    value.length > REPORT_TEXT_MAX ||
    value.includes('\0') ||
    value.trim().length === 0
  ) {
    return null;
  }
  return value;
}

export function parseAbsolutePath(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const filePath = value.trim();
  if (filePath.length === 0 || filePath.includes('\0')) {
    return null;
  }
  if (/^[A-Za-z]:[\\/]/.test(filePath)) {
    return filePath;
  }
  if (filePath.startsWith('\\\\')) {
    return filePath;
  }
  if (filePath.startsWith('/') && !filePath.startsWith('//')) {
    return filePath;
  }
  return null;
}

export function parseOpenTextResult(value: unknown): OpenTextResult | null {
  if (!isRecord(value)) {
    return null;
  }
  const path = parseAbsolutePath(value.path);
  if (
    !path ||
    typeof value.preview !== 'string' ||
    typeof value.truncated !== 'boolean'
  ) {
    return null;
  }
  return { path, preview: value.preview, truncated: value.truncated };
}

export function parseSaveReportResult(value: unknown): SaveReportResult | null {
  if (!isRecord(value)) {
    return null;
  }
  const path = parseAbsolutePath(value.path);
  if (!path) {
    return null;
  }
  return { path };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
