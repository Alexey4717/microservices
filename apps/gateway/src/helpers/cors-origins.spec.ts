import { describe, expect, it } from 'vitest';

import { originFromUrl, resolveGatewayCorsOrigins } from './cors-origins';

describe('resolveGatewayCorsOrigins', () => {
  it('оставляет CORS_ORIGIN без Mini App URL', () => {
    expect(resolveGatewayCorsOrigins('http://localhost:4000', undefined)).toBe(
      'http://localhost:4000',
    );
  });

  it('добавляет origin TELEGRAM_MINI_APP_URL рядом с CORS_ORIGIN', () => {
    expect(
      resolveGatewayCorsOrigins(
        'http://localhost:4000',
        'https://abc.ngrok-free.app/',
      ),
    ).toEqual(['http://localhost:4000', 'https://abc.ngrok-free.app']);
  });

  it('не дублирует origin, если Mini App совпадает с CORS_ORIGIN', () => {
    expect(
      resolveGatewayCorsOrigins(
        'https://app.example.com',
        'https://app.example.com/cabinet',
      ),
    ).toBe('https://app.example.com');
  });
});

describe('originFromUrl', () => {
  it('отбрасывает path Mini App URL', () => {
    expect(originFromUrl('https://abc.ngrok-free.app/videos')).toBe(
      'https://abc.ngrok-free.app',
    );
  });
});
