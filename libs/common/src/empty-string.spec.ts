import { describe, expect, it } from 'vitest';

import { emptyToNull, emptyToUndefined } from './empty-string';

describe('emptyToUndefined', () => {
  it('возвращает trimmed-строку', () => {
    expect(emptyToUndefined('  ann  ')).toBe('ann');
  });

  it('пустую строку, пробелы, null и undefined сводит к undefined', () => {
    expect(emptyToUndefined('')).toBeUndefined();
    expect(emptyToUndefined('   ')).toBeUndefined();
    expect(emptyToUndefined(null)).toBeUndefined();
    expect(emptyToUndefined(undefined)).toBeUndefined();
  });
});

describe('emptyToNull', () => {
  it('возвращает trimmed-строку', () => {
    expect(emptyToNull('  ann  ')).toBe('ann');
  });

  it('пустую строку, пробелы, null и undefined сводит к null', () => {
    expect(emptyToNull('')).toBeNull();
    expect(emptyToNull('   ')).toBeNull();
    expect(emptyToNull(null)).toBeNull();
    expect(emptyToNull(undefined)).toBeNull();
  });
});
