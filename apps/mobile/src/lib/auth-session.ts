import * as SecureStore from 'expo-secure-store';

const REFRESH_KEY = 'refreshToken';

let accessToken = '';
let memoryRefreshToken = '';

const clearedListeners = new Set<() => void>();

export function readAccessToken(): string {
  return accessToken;
}

export function rememberAccessToken(token: string): void {
  accessToken = token;
}

export function subscribeSessionCleared(listener: () => void): () => void {
  clearedListeners.add(listener);
  return () => {
    clearedListeners.delete(listener);
  };
}

export function notifySessionCleared(): void {
  for (const listener of clearedListeners) {
    listener();
  }
}

async function secureStoreAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function readRefreshToken(): Promise<string> {
  if (!(await secureStoreAvailable())) {
    return memoryRefreshToken;
  }

  try {
    return (await SecureStore.getItemAsync(REFRESH_KEY)) ?? '';
  } catch {
    return memoryRefreshToken;
  }
}

export async function writeRefreshToken(token: string): Promise<void> {
  memoryRefreshToken = token;
  if (!(await secureStoreAvailable())) {
    return;
  }

  if (!token) {
    await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => undefined);
    return;
  }

  await SecureStore.setItemAsync(REFRESH_KEY, token);
}

export async function clearSession(): Promise<void> {
  accessToken = '';
  await writeRefreshToken('');
}
