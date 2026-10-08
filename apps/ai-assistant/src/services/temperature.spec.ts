import { describe, expect, it } from 'vitest';

import { clampTemperature, resolveTemperature } from './temperature';

describe('clamp temperature', () => {
  it('удерживает значение в диапазоне 0..1', () => {
    expect(clampTemperature(-0.2, 0.2)).toBe(0);
    expect(clampTemperature(1.4, 0.2)).toBe(1);
    expect(clampTemperature(0.3, 0.2)).toBe(0.3);
    expect(clampTemperature(0, 0.2)).toBe(0);
  });

  it('без значения клиента берёт дефолт', () => {
    expect(clampTemperature(Number.NaN, 0.2)).toBe(0.2);
    expect(resolveTemperature(undefined, 0.2)).toBe(0.2);
    expect(resolveTemperature(undefined, 5)).toBe(1);
  });
});
