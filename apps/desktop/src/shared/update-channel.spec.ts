/// <reference types="vitest/globals" />

import {
  isUpdateStatus,
  resolveUpdateChannel,
  sanitizeUpdateVersion,
} from './update-channel';

describe('resolveUpdateChannel', () => {
  it('пустое значение значит, что канал не задан', () => {
    expect(resolveUpdateChannel(undefined)).toEqual({ status: 'missing' });
    expect(resolveUpdateChannel('   ')).toEqual({ status: 'missing' });
  });

  it('принимает http(s) и отклоняет прочие схемы', () => {
    expect(resolveUpdateChannel('https://updates.example/cabinet')).toEqual({
      status: 'ready',
      url: 'https://updates.example/cabinet',
    });
    expect(resolveUpdateChannel('ftp://updates.example/cabinet')).toEqual({
      status: 'invalid',
    });
    expect(resolveUpdateChannel('not a url')).toEqual({ status: 'invalid' });
    expect(resolveUpdateChannel('https://user:pass@updates.example/')).toEqual({
      status: 'invalid',
    });
  });
});

describe('sanitizeUpdateVersion', () => {
  it('оставляет короткую версию и отбрасывает мусор', () => {
    expect(sanitizeUpdateVersion(' 0.2.0-beta.1 ')).toBe('0.2.0-beta.1');
    expect(sanitizeUpdateVersion('1.0.0<script>')).toBeNull();
    expect(sanitizeUpdateVersion('')).toBeNull();
  });
});

describe('isUpdateStatus', () => {
  it('проверяет состояние канала', () => {
    expect(isUpdateStatus({ state: 'unconfigured' })).toBe(true);
    expect(isUpdateStatus({ state: 'available', version: '0.2.0' })).toBe(true);
    expect(isUpdateStatus({ state: 'elsewhere' })).toBe(false);
    expect(isUpdateStatus({ state: 'idle', version: 1 })).toBe(false);
  });
});
