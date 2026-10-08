export function clampTemperature(value: number, fallback = 0.2): number {
  const fallbackValue = clampUnit(Number.isFinite(fallback) ? fallback : 0.2);
  if (!Number.isFinite(value)) {
    return fallbackValue;
  }
  return clampUnit(value);
}

export function resolveTemperature(
  requested: number | undefined,
  fallback: number,
): number {
  if (requested === undefined) {
    return clampTemperature(fallback, 0.2);
  }
  return clampTemperature(requested, fallback);
}

export function parseTemperatureInput(
  raw: string | number | null | undefined,
): number | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : undefined;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, value));
}
