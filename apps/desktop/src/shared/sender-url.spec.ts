/// <reference types="vitest/globals" />

import { isTrustedSenderUrl } from './sender-url';

const PACKAGED =
  'file:///C:/Program%20Files/Cabinet/resources/app.asar/out/renderer/index.html';

describe('isTrustedSenderUrl', () => {
  it('принимает dev-URL Vite на 127.0.0.1:4002', () => {
    expect(isTrustedSenderUrl('http://127.0.0.1:4002/', PACKAGED)).toBe(true);
    expect(isTrustedSenderUrl('http://127.0.0.1:4002/#/system', PACKAGED)).toBe(
      true,
    );
  });

  it('отклоняет чужой origin, порт и учётные данные', () => {
    expect(isTrustedSenderUrl('http://localhost:4002/', PACKAGED)).toBe(false);
    expect(isTrustedSenderUrl('http://127.0.0.1:4003/', PACKAGED)).toBe(false);
    expect(isTrustedSenderUrl('https://127.0.0.1:4002/', PACKAGED)).toBe(false);
    expect(
      isTrustedSenderUrl('http://127.0.0.1.example.com:4002/', PACKAGED),
    ).toBe(false);
    expect(
      isTrustedSenderUrl('http://user:pass@127.0.0.1:4002/', PACKAGED),
    ).toBe(false);
    expect(isTrustedSenderUrl('', PACKAGED)).toBe(false);
    expect(isTrustedSenderUrl(null, PACKAGED)).toBe(false);
    expect(isTrustedSenderUrl('not a url', PACKAGED)).toBe(false);
  });

  it('принимает только file:// упакованного index.html', () => {
    expect(isTrustedSenderUrl(`${PACKAGED}#/profile`, PACKAGED)).toBe(true);
    expect(
      isTrustedSenderUrl(
        'file:///c:/program%20files/cabinet/resources/app.asar/out/renderer/index.html',
        PACKAGED,
      ),
    ).toBe(true);
    expect(
      isTrustedSenderUrl(
        'file:///C:/Program%20Files/Cabinet/resources/app.asar/out/renderer/other.html',
        PACKAGED,
      ),
    ).toBe(false);
    expect(isTrustedSenderUrl('file:///D:/app/index.html', PACKAGED)).toBe(
      false,
    );
  });
});
