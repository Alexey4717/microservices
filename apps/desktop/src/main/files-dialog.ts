import { BrowserWindow, dialog, shell } from 'electron';
import { existsSync } from 'node:fs';
import { open, writeFile } from 'node:fs/promises';

import {
  containsNullByte,
  parseAbsolutePath,
  parseReportText,
  previewText,
  TEXT_SAMPLE_BYTES,
  type OpenTextResult,
  type SaveReportResult,
} from '../shared/file-payload';

export async function openTextFile(
  win: BrowserWindow,
): Promise<OpenTextResult | null> {
  const selected = await dialog.showOpenDialog(win, {
    title: 'Открыть текстовый файл',
    properties: ['openFile'],
    filters: [
      { name: 'Текст', extensions: ['txt', 'md', 'json', 'log', 'csv'] },
      { name: 'Все файлы', extensions: ['*'] },
    ],
  });

  const filePath = selected.filePaths[0];
  if (selected.canceled || !filePath) {
    return null;
  }

  return readTextPreview(filePath);
}

export async function saveReport(
  win: BrowserWindow,
  text: unknown,
): Promise<SaveReportResult | null> {
  const report = parseReportText(text);
  if (!report) {
    throw new Error('Пустой отчёт');
  }

  const selected = await dialog.showSaveDialog(win, {
    title: 'Сохранить отчёт стенда',
    defaultPath: 'отчёт-стенда.txt',
    filters: [{ name: 'Текст', extensions: ['txt'] }],
  });

  if (selected.canceled || !selected.filePath) {
    return null;
  }

  await writeFile(selected.filePath, report, 'utf8');
  return { path: selected.filePath };
}

export function revealSavedFile(filePath: unknown): void {
  const absolute = parseAbsolutePath(filePath);
  if (!absolute || !existsSync(absolute)) {
    throw new Error('Файл не найден');
  }
  shell.showItemInFolder(absolute);
}

async function readTextPreview(filePath: string): Promise<OpenTextResult> {
  const file = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(TEXT_SAMPLE_BYTES);
    const { bytesRead } = await file.read(buffer, 0, TEXT_SAMPLE_BYTES, 0);
    const sample = buffer.subarray(0, bytesRead);
    if (containsNullByte(sample)) {
      throw new Error('Файл не похож на текст');
    }
    const preview = previewText(sample.toString('utf8'));
    return {
      path: filePath,
      preview: preview.text,
      truncated: preview.truncated,
    };
  } finally {
    await file.close();
  }
}
