/// <reference types="vitest/globals" />

import {
  isDesktopPreferences,
  parseDesktopPreferences,
  serializeDesktopPreferences,
} from './desktop-preferences';

describe('parseDesktopPreferences', () => {
  it('читает флаг из JSON и из объекта', () => {
    expect(parseDesktopPreferences('{"minimizeToTray":true}')).toEqual({
      minimizeToTray: true,
    });
    expect(parseDesktopPreferences({ minimizeToTray: true })).toEqual({
      minimizeToTray: true,
    });
  });

  it('любой мусор сводит к выключенному сворачиванию', () => {
    expect(parseDesktopPreferences('')).toEqual({ minimizeToTray: false });
    expect(parseDesktopPreferences('{')).toEqual({ minimizeToTray: false });
    expect(parseDesktopPreferences({ minimizeToTray: 'yes' })).toEqual({
      minimizeToTray: false,
    });
    expect(parseDesktopPreferences(null)).toEqual({ minimizeToTray: false });
  });
});

describe('serializeDesktopPreferences', () => {
  it('крутит только флаг сворачивания в трей', () => {
    const raw = serializeDesktopPreferences({ minimizeToTray: true });
    expect(parseDesktopPreferences(raw)).toEqual({ minimizeToTray: true });
    expect(raw).not.toContain('refresh');
  });
});

describe('isDesktopPreferences', () => {
  it('принимает только boolean-флаг', () => {
    expect(isDesktopPreferences({ minimizeToTray: false })).toBe(true);
    expect(isDesktopPreferences({ minimizeToTray: 'false' })).toBe(false);
    expect(isDesktopPreferences(null)).toBe(false);
  });
});
