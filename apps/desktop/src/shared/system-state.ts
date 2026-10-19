export type LoginItemState = {
  openAtLogin: boolean;
};

export type CrashStatus = {
  dumpDirectory: string;
  hadTrainingCrash: boolean;
};

export function parseBooleanFlag(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

export function parseLoginItemState(value: unknown): LoginItemState | null {
  if (!isRecord(value) || typeof value.openAtLogin !== 'boolean') {
    return null;
  }
  return { openAtLogin: value.openAtLogin };
}

export function parseCrashStatus(value: unknown): CrashStatus | null {
  if (
    !isRecord(value) ||
    typeof value.dumpDirectory !== 'string' ||
    value.dumpDirectory.trim().length === 0 ||
    typeof value.hadTrainingCrash !== 'boolean'
  ) {
    return null;
  }
  return {
    dumpDirectory: value.dumpDirectory,
    hadTrainingCrash: value.hadTrainingCrash,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
