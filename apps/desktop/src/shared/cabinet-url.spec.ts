/// <reference types="vitest/globals" />

import {
  cabinetRouteFromArgv,
  devProtocolScript,
  navigationScript,
  parseCabinetUrl,
} from './cabinet-url';

describe('parseCabinetUrl', () => {
  it('разбирает маршруты стенда', () => {
    expect(parseCabinetUrl('cabinet://open/')).toBe('/');
    expect(parseCabinetUrl('cabinet://open')).toBe('/');
    expect(parseCabinetUrl('cabinet://open/profile')).toBe('/profile');
    expect(parseCabinetUrl('cabinet://open/profile/')).toBe('/profile');
    expect(parseCabinetUrl('cabinet://open/system?from=link')).toBe('/system');
  });

  it('игнорирует чужие адреса', () => {
    expect(parseCabinetUrl('cabinet://open/login')).toBeNull();
    expect(parseCabinetUrl('cabinet://profile')).toBeNull();
    expect(parseCabinetUrl('https://open/profile')).toBeNull();
    expect(parseCabinetUrl('cabinet:open/profile')).toBeNull();
  });
});

describe('cabinetRouteFromArgv', () => {
  it('берёт первую корректную ссылку из argv', () => {
    expect(
      cabinetRouteFromArgv([
        'C:\\Cabinet\\Кабинет.exe',
        'cabinet://open/not-a-page',
        'cabinet://open/system',
      ]),
    ).toBe('/system');
    expect(cabinetRouteFromArgv(['electron.exe', 'app.js'])).toBeNull();
  });
});

describe('devProtocolScript', () => {
  it('в dev возвращает путь скрипта, в упакованной сборке — нет', () => {
    expect(devProtocolScript(true, 'C:\\app\\out\\main\\index.js')).toBe(
      'C:\\app\\out\\main\\index.js',
    );
    expect(devProtocolScript(false, 'C:\\app\\out\\main\\index.js')).toBeNull();
    expect(devProtocolScript(true, '--inspect')).toBeNull();
    expect(devProtocolScript(true, undefined)).toBeNull();
  });
});

describe('navigationScript', () => {
  it('подставляет хеш существующего маршрута', () => {
    expect(navigationScript('/profile')).toBe(
      'window.location.hash = "#/profile"',
    );
    expect(navigationScript('/')).toBe('window.location.hash = "#/"');
  });
});
