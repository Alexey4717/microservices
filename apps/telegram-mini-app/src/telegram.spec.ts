import { describe, expect, it } from 'vitest';

import {
  miniAppInitialPath,
  parseInitDataFromLocationHash,
  parseStartParamFromLocationHash,
} from './telegram';

const INIT_DATA = 'user={"id":1}&auth_date=1&hash=abc';

describe('parseInitDataFromLocationHash', () => {
  it('reads encoded tgWebAppData from Telegram WebView hash', () => {
    const hash = `#tgWebAppData=${encodeURIComponent(INIT_DATA)}&tgWebAppVersion=8.0&tgWebAppPlatform=android`;
    expect(parseInitDataFromLocationHash(hash)).toBe(INIT_DATA);
  });

  it('reads tgWebAppData when inner & is not encoded', () => {
    const hash = `#tgWebAppData=${INIT_DATA}&tgWebAppVersion=8.0`;
    expect(parseInitDataFromLocationHash(hash)).toBe(INIT_DATA);
  });

  it('ignores hash routes that are not Telegram init data', () => {
    expect(parseInitDataFromLocationHash('#/videos')).toBe('');
    expect(parseInitDataFromLocationHash('')).toBe('');
    expect(parseInitDataFromLocationHash('#')).toBe('');
  });
});

describe('parseStartParamFromLocationHash', () => {
  it('reads tgWebAppStartParam without treating Telegram hash as a route', () => {
    const hash = `#tgWebAppData=${encodeURIComponent(INIT_DATA)}&tgWebAppStartParam=videos`;
    expect(parseStartParamFromLocationHash(hash)).toBe('videos');
  });
});

describe('miniAppInitialPath', () => {
  it('opens /videos only for start_param=videos', () => {
    expect(miniAppInitialPath('videos')).toBe('/videos');
    expect(miniAppInitialPath('')).toBe('/');
    expect(miniAppInitialPath('cabinet')).toBe('/');
  });
});
