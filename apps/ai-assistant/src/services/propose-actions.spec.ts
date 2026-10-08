import { describe, expect, it } from 'vitest';

import {
  normalizeAppPagePath,
  parseProposeCheckout,
  parseProposeNavigation,
  parseProposeUpdateName,
} from './propose-actions';

describe('allowlist маршрутов', () => {
  it('принимает только пути приложения', () => {
    expect(parseProposeNavigation({ path: '/profile' })).toEqual({
      ok: true,
      path: '/profile',
    });
    expect(parseProposeNavigation({ path: '/' }).ok).toBe(true);
    expect(parseProposeNavigation({ path: '/payments' }).ok).toBe(true);
    expect(parseProposeNavigation({ path: '/videos/' })).toEqual({
      ok: true,
      path: '/videos',
    });
  });

  it('отклоняет произвольный URL и чужие пути', () => {
    expect(
      parseProposeNavigation({ path: 'https://evil.example/profile' }).ok,
    ).toBe(false);
    expect(parseProposeNavigation({ path: '/admin' }).ok).toBe(false);
    expect(parseProposeNavigation({ path: '/payments/order-1' }).ok).toBe(
      false,
    );
    expect(parseProposeNavigation({ path: '//profile' }).ok).toBe(false);
  });

  it('игнорирует user id в аргументах перехода', () => {
    expect(
      parseProposeNavigation({ path: '/ai-assistant', userId: 'attacker' }),
    ).toEqual({ ok: true, path: '/ai-assistant' });
  });

  it('кладёт в промпт только путь приложения', () => {
    expect(normalizeAppPagePath('/profile')).toBe('/profile');
    expect(
      normalizeAppPagePath('/payments/11111111-1111-1111-1111-111111111111'),
    ).toBe('/payments/11111111-1111-1111-1111-111111111111');
    expect(normalizeAppPagePath('https://evil.example')).toBeNull();
    expect(normalizeAppPagePath('/secret')).toBeNull();
  });
});

describe('парсинг propose-*', () => {
  it('propose_checkout нормализует провайдера и продукт', () => {
    expect(parseProposeCheckout({ provider: 'stripe' })).toEqual({
      ok: true,
      provider: 'STRIPE',
      productCode: 'PREMIUM',
    });
    expect(
      parseProposeCheckout({ provider: 'PAYPAL', productCode: 'premium' }),
    ).toEqual({
      ok: true,
      provider: 'PAYPAL',
      productCode: 'PREMIUM',
    });
    expect(parseProposeCheckout({ provider: 'CARD' }).ok).toBe(false);
    expect(
      parseProposeCheckout({ provider: 'STRIPE', productCode: 'OTHER' }).ok,
    ).toBe(false);
    expect(
      parseProposeCheckout({ provider: 'STRIPE', userId: 'attacker' }),
    ).toEqual({
      ok: true,
      provider: 'STRIPE',
      productCode: 'PREMIUM',
    });
  });

  it('propose_update_name требует непустое имя', () => {
    expect(parseProposeUpdateName({ name: '  Алекс  ' })).toEqual({
      ok: true,
      name: 'Алекс',
    });
    expect(parseProposeUpdateName({ name: '   ' }).ok).toBe(false);
    expect(parseProposeUpdateName({ name: '' }).ok).toBe(false);
    expect(parseProposeUpdateName({ userId: 'attacker' }).ok).toBe(false);
  });
});
