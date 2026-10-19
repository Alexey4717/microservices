/// <reference types="vitest/globals" />

import {
  containsNullByte,
  parseAbsolutePath,
  parseOpenTextResult,
  parseReportText,
  parseSaveReportResult,
  previewText,
  REPORT_TEXT_MAX,
} from './file-payload';

describe('previewText', () => {
  it('показывает начало и помечает обрезку', () => {
    expect(previewText('привет', 3)).toEqual({
      text: 'при',
      truncated: true,
    });
    expect(previewText('\uFEFFкабинет')).toEqual({
      text: 'кабинет',
      truncated: false,
    });
  });
});

describe('containsNullByte', () => {
  it('отличает двоичный образец', () => {
    expect(containsNullByte(Uint8Array.from([0x61, 0]))).toBe(true);
    expect(containsNullByte(Uint8Array.from([0x61, 0x62]))).toBe(false);
  });
});

describe('parseReportText', () => {
  it('принимает непустой текст отчёта', () => {
    expect(parseReportText('Отчёт стенда')).toBe('Отчёт стенда');
    expect(parseReportText('   ')).toBeNull();
    expect(parseReportText('a\0b')).toBeNull();
    expect(parseReportText('x'.repeat(REPORT_TEXT_MAX + 1))).toBeNull();
    expect(parseReportText(12)).toBeNull();
  });
});

describe('parseAbsolutePath', () => {
  it('принимает абсолютный путь и отклоняет относительный', () => {
    expect(parseAbsolutePath('C:\\Users\\report.txt')).toBe(
      'C:\\Users\\report.txt',
    );
    expect(parseAbsolutePath('/tmp/report.txt')).toBe('/tmp/report.txt');
    expect(parseAbsolutePath('\\\\server\\share\\report.txt')).toBe(
      '\\\\server\\share\\report.txt',
    );
    expect(parseAbsolutePath('report.txt')).toBeNull();
    expect(parseAbsolutePath('C:report.txt')).toBeNull();
    expect(parseAbsolutePath('C:\\a\0b')).toBeNull();
  });
});

describe('parseOpenTextResult', () => {
  it('собирает путь и превью', () => {
    expect(
      parseOpenTextResult({
        path: 'C:\\notes.txt',
        preview: 'начало',
        truncated: false,
      }),
    ).toEqual({
      path: 'C:\\notes.txt',
      preview: 'начало',
      truncated: false,
    });
    expect(
      parseOpenTextResult({ path: 'notes.txt', preview: '', truncated: false }),
    ).toBeNull();
  });
});

describe('parseSaveReportResult', () => {
  it('требует абсолютный путь', () => {
    expect(parseSaveReportResult({ path: 'D:\\отчёт.txt' })).toEqual({
      path: 'D:\\отчёт.txt',
    });
    expect(parseSaveReportResult({ path: 'отчёт.txt' })).toBeNull();
  });
});
