export function emptyToUndefined(
  value: string | null | undefined,
): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function emptyToNull(value: string | null | undefined): string | null {
  return emptyToUndefined(value) ?? null;
}
