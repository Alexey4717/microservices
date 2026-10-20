import { videoIdFromPageUrl } from '../shared/cabinet-url';
import { readNotes, writeNote } from '../shared/storage';

const NOTE_UNAVAILABLE = 'Заметка доступна на странице ролика';

let currentId: string | null = null;
let renderSeq = 0;

function requireElement<T extends Element>(id: string): T {
  const element = document.querySelector<T>(`#${id}`);
  if (!element) throw new Error(`Не найден #${id}`);
  return element;
}

async function activeVideoId(): Promise<string | null> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!tab?.url) return null;
  return videoIdFromPageUrl(tab.url);
}

async function render(): Promise<void> {
  const seq = ++renderSeq;
  const empty = requireElement<HTMLParagraphElement>('empty');
  const editor = requireElement<HTMLFormElement>('editor');
  const label = requireElement<HTMLParagraphElement>('video-label');
  const note = requireElement<HTMLTextAreaElement>('note');
  const status = requireElement<HTMLParagraphElement>('status');
  const id = await activeVideoId();
  if (seq !== renderSeq) return;

  if (!id) {
    currentId = null;
    editor.hidden = true;
    empty.hidden = false;
    empty.textContent = NOTE_UNAVAILABLE;
    return;
  }

  empty.hidden = true;
  editor.hidden = false;
  if (currentId === id) return;

  currentId = id;
  label.textContent = id;
  const notes = await readNotes();
  if (seq !== renderSeq) return;
  note.value = notes[id] ?? '';
  status.textContent = '';
}

function init(): void {
  const editor = requireElement<HTMLFormElement>('editor');
  const note = requireElement<HTMLTextAreaElement>('note');
  const status = requireElement<HTMLParagraphElement>('status');

  editor.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!currentId) return;
    const videoId = currentId;
    const text = note.value;
    void writeNote(videoId, text).then(() => {
      if (currentId === videoId) status.textContent = 'Заметка сохранена';
    });
  });

  chrome.tabs.onActivated.addListener(() => {
    void render();
  });
  chrome.tabs.onUpdated.addListener(() => {
    void render();
  });
  void render();
}

init();
