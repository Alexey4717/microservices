import type { DesktopSystemApi } from '../../shared/desktop-api';

export function desktopSystem(): DesktopSystemApi {
  const system = window.desktop?.system;
  if (!system) {
    throw new Error('Мост системы недоступен');
  }
  return system;
}

export function desktopErrorText(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Не удалось выполнить действие.';
  }
  const message = error.message
    .replace(/^Error invoking remote method '[^']+': /, '')
    .trim();
  return message || 'Не удалось выполнить действие.';
}
