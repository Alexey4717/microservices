import { STORAGE_NOTES, STORAGE_SEEN, STORAGE_TITLES } from './constants';

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function noteMap(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  const notes: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string') notes[key] = item;
  }
  return notes;
}

export async function readSeenIds(): Promise<string[]> {
  const stored = await chrome.storage.local.get(STORAGE_SEEN);
  return stringList(stored[STORAGE_SEEN]);
}

export async function addSeenId(id: string): Promise<void> {
  const ids = await readSeenIds();
  if (ids.includes(id)) return;
  await chrome.storage.local.set({ [STORAGE_SEEN]: [...ids, id] });
}

export async function readNotes(): Promise<Record<string, string>> {
  const stored = await chrome.storage.local.get(STORAGE_NOTES);
  return noteMap(stored[STORAGE_NOTES]);
}

export async function writeNote(videoId: string, text: string): Promise<void> {
  const notes = await readNotes();
  notes[videoId] = text;
  await chrome.storage.local.set({ [STORAGE_NOTES]: notes });
}

export async function appendSavedTitle(title: string): Promise<void> {
  const stored = await chrome.storage.local.get(STORAGE_TITLES);
  const titles = stringList(stored[STORAGE_TITLES]);
  titles.push(title);
  await chrome.storage.local.set({ [STORAGE_TITLES]: titles });
}
