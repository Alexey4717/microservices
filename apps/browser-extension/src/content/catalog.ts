import { videoIdFromHref, videoIdFromPathname } from '../shared/cabinet-url';
import { addSeenId, readSeenIds } from '../shared/storage';

const NAVIGATE_EVENT = 'cabinet-extension-navigate';
const PAGE_HOOK = '__cabinetHistoryHook';
const CATALOG_HOOK = '__cabinetCatalogHook';

function inIsolatedWorld(): boolean {
  return (
    typeof chrome !== 'undefined' && typeof chrome.runtime?.id === 'string'
  );
}

function installHistoryHook(): void {
  const page = window as Window & { [PAGE_HOOK]?: boolean };
  if (page[PAGE_HOOK]) return;
  page[PAGE_HOOK] = true;

  const notify = () => {
    document.dispatchEvent(new Event(NAVIGATE_EVENT, { bubbles: true }));
  };
  const push = history.pushState.bind(history);
  const replace = history.replaceState.bind(history);

  history.pushState = ((...args: Parameters<History['pushState']>) => {
    const result = push(...args);
    notify();
    return result;
  }) as History['pushState'];

  history.replaceState = ((...args: Parameters<History['replaceState']>) => {
    const result = replace(...args);
    notify();
    return result;
  }) as History['replaceState'];
}

function installCatalog(): void {
  const page = window as Window & { [CATALOG_HOOK]?: boolean };
  if (page[CATALOG_HOOK]) return;
  page[CATALOG_HOOK] = true;

  let painting = false;
  let running = false;
  let queued = false;
  let timer = 0;
  let followUp = 0;

  const observer = new MutationObserver(() => {
    if (painting) return;
    scheduleRefresh();
  });

  function scheduleRefresh(): void {
    window.clearTimeout(timer);
    window.clearTimeout(followUp);
    timer = window.setTimeout(() => {
      void refresh();
    }, 50);
    followUp = window.setTimeout(() => {
      void refresh();
    }, 400);
  }

  async function refresh(): Promise<void> {
    if (running) {
      queued = true;
      return;
    }

    running = true;
    try {
      do {
        queued = false;
        await paint();
      } while (queued);
    } finally {
      running = false;
    }
  }

  async function paint(): Promise<void> {
    const opened = videoIdFromPathname(location.pathname);
    if (opened) await addSeenId(opened);
    const seen = new Set(await readSeenIds());
    renderBadges(seen);
  }

  function renderBadges(seen: Set<string>): void {
    painting = true;
    try {
      const keep = new Set<HTMLElement>();
      const anchors = document.querySelectorAll<HTMLAnchorElement>('a[href]');

      for (const anchor of anchors) {
        const id = videoIdFromHref(
          anchor.getAttribute('href'),
          location.origin,
        );
        if (!id) continue;

        const existing = anchor.querySelector<HTMLElement>(
          ':scope > .ext-new-badge',
        );
        if (seen.has(id)) {
          existing?.remove();
          anchor.classList.remove('ext-new-card');
          continue;
        }

        anchor.classList.add('ext-new-card');
        const badge = existing ?? document.createElement('span');
        badge.className = 'ext-new-badge';
        badge.textContent = 'новое';
        if (!existing) anchor.append(badge);
        keep.add(badge);
      }

      for (const badge of document.querySelectorAll<HTMLElement>(
        '.ext-new-badge',
      )) {
        if (keep.has(badge)) continue;
        badge.parentElement?.classList.remove('ext-new-card');
        badge.remove();
      }
    } finally {
      queueMicrotask(() => {
        painting = false;
      });
    }
  }

  document.addEventListener(NAVIGATE_EVENT, scheduleRefresh);
  window.addEventListener('popstate', scheduleRefresh);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  scheduleRefresh();
}

if (inIsolatedWorld()) {
  installCatalog();
} else {
  installHistoryHook();
}
