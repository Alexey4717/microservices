/// <reference types="vitest/globals" />

import {
  parseBooleanFlag,
  parseCrashStatus,
  parseLoginItemState,
} from './system-state';

describe('parseBooleanFlag', () => {
  it('принимает только boolean', () => {
    expect(parseBooleanFlag(true)).toBe(true);
    expect(parseBooleanFlag(false)).toBe(false);
    expect(parseBooleanFlag('true')).toBeNull();
    expect(parseBooleanFlag(1)).toBeNull();
  });
});

describe('parseLoginItemState', () => {
  it('читает openAtLogin', () => {
    expect(parseLoginItemState({ openAtLogin: true })).toEqual({
      openAtLogin: true,
    });
    expect(parseLoginItemState({ openAtLogin: 'yes' })).toBeNull();
  });
});

describe('parseCrashStatus', () => {
  it('читает каталог дампов и флаг учебного падения', () => {
    expect(
      parseCrashStatus({
        dumpDirectory: 'C:\\Users\\dumps\\Crashpad',
        hadTrainingCrash: true,
      }),
    ).toEqual({
      dumpDirectory: 'C:\\Users\\dumps\\Crashpad',
      hadTrainingCrash: true,
    });
    expect(
      parseCrashStatus({ dumpDirectory: '   ', hadTrainingCrash: true }),
    ).toBeNull();
  });
});
