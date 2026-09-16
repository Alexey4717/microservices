import { describe, expect, it } from 'vitest';

import { paymentReturnUrl } from './payment-return-url';

describe('paymentReturnUrl', () => {
  it('заменяет path и query на /payments/:id, origin берёт из base', () => {
    expect(
      paymentReturnUrl(
        'http://localhost:4000/checkout?foo=bar',
        '11111111-1111-1111-1111-111111111111',
      ),
    ).toBe(
      'http://localhost:4000/payments/11111111-1111-1111-1111-111111111111',
    );
  });

  it('отбрасывает hash и вложенный путь, оставляя хост base URL', () => {
    expect(
      paymentReturnUrl('https://app.example.com/foo/bar?x=1#hash', 'abc'),
    ).toBe('https://app.example.com/payments/abc');
  });

  it('работает, если base — только origin без path', () => {
    expect(paymentReturnUrl('http://localhost:4000', 'pay-1')).toBe(
      'http://localhost:4000/payments/pay-1',
    );
  });

  it('бросает ошибку при пустом id', () => {
    expect(() =>
      paymentReturnUrl('http://localhost:4000', '  '),
    ).toThrow(RangeError);
  });

  it('бросает ошибку при невалидном base URL', () => {
    expect(() => paymentReturnUrl('not-a-url', 'pay-1')).toThrow();
  });
});
