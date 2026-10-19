/// <reference types="vitest/globals" />

import { classifyNavigation } from './navigation-policy';

const PACKAGED =
  'file:///C:/Cabinet/resources/app.asar/out/renderer/index.html';

describe('classifyNavigation', () => {
  it('оставляет переход внутри приложения', () => {
    expect(
      classifyNavigation('http://127.0.0.1:4002/#/system', PACKAGED),
    ).toEqual({ action: 'allow' });
    expect(classifyNavigation(PACKAGED, PACKAGED)).toEqual({ action: 'allow' });
  });

  it('внешний http(s) отдаёт наружу, не в окно', () => {
    expect(
      classifyNavigation('https://example.com/docs?q=1', PACKAGED),
    ).toEqual({
      action: 'external',
      url: 'https://example.com/docs?q=1',
    });
    expect(classifyNavigation('  http://example.com/a  ', PACKAGED)).toEqual({
      action: 'external',
      url: 'http://example.com/a',
    });
  });

  it('блокирует чужие схемы и пустой адрес', () => {
    expect(classifyNavigation('cabinet://open/profile', PACKAGED)).toEqual({
      action: 'deny',
    });
    expect(classifyNavigation('javascript:alert(1)', PACKAGED)).toEqual({
      action: 'deny',
    });
    expect(
      classifyNavigation('file:///C:/Windows/notepad.exe', PACKAGED),
    ).toEqual({ action: 'deny' });
    expect(classifyNavigation('', PACKAGED)).toEqual({ action: 'deny' });
    expect(
      classifyNavigation('https://user:pass@example.com/', PACKAGED),
    ).toEqual({ action: 'deny' });
  });
});
