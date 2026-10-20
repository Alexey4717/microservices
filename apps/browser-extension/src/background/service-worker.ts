import { isCabinetPageUrl } from '../shared/cabinet-url';
import {
  ALARM_PROFILE,
  CABINET_ORIGIN,
  COMMAND_OPEN_PANEL,
  GRAPHQL_URLS,
  MENU_SAVE_TITLE,
  SESSION_GRAPHQL_COUNT,
} from '../shared/constants';
import { appendSavedTitle } from '../shared/storage';

function isPing(message: unknown): message is { type: 'ping' } {
  if (typeof message !== 'object' || message === null || !('type' in message)) {
    return false;
  }

  return message.type === 'ping';
}

function isCabinetTab(url: string | undefined): boolean {
  return isCabinetPageUrl(url);
}

function badgeText(count: number): string {
  if (count <= 0) return '';
  if (count > 999) return '999+';
  return String(count);
}

function installMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create(
      {
        id: MENU_SAVE_TITLE,
        title: 'Сохранить название',
        contexts: ['selection'],
        documentUrlPatterns: [`${CABINET_ORIGIN}/*`],
      },
      () => {
        if (chrome.runtime.lastError) return;
      },
    );
  });
}

function openPanelFromCommand(): void {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    const tabId = tabs[0]?.id;
    if (tabId === undefined) return;
    void Promise.resolve(chrome.sidePanel.open({ tabId })).catch(
      () => undefined,
    );
  });
}

let graphqlQueue: Promise<void> = Promise.resolve();

function enqueueGraphql(tabId: number): void {
  if (tabId < 0) return;
  graphqlQueue = graphqlQueue
    .then(() => countGraphql(tabId))
    .catch(() => undefined);
}

async function countGraphql(tabId: number): Promise<void> {
  let tab: chrome.tabs.Tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    return;
  }

  if (!isCabinetTab(tab.url)) return;

  const stored = await chrome.storage.session.get(SESSION_GRAPHQL_COUNT);
  const previous = stored[SESSION_GRAPHQL_COUNT];
  const count = (typeof previous === 'number' ? previous : 0) + 1;
  await chrome.storage.session.set({ [SESSION_GRAPHQL_COUNT]: count });
  await chrome.action.setBadgeText({ text: badgeText(count) });
}

async function restoreBadge(): Promise<void> {
  const stored = await chrome.storage.session.get(SESSION_GRAPHQL_COUNT);
  const count = stored[SESSION_GRAPHQL_COUNT];
  await chrome.action.setBadgeBackgroundColor({ color: '#18181b' });
  await chrome.action.setBadgeText({
    text: badgeText(typeof count === 'number' ? count : 0),
  });
}

chrome.runtime.onInstalled.addListener(() => {
  installMenus();
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
});

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_SAVE_TITLE) return;
  const title = info.selectionText?.trim();
  if (!title) return;
  void appendSavedTitle(title);
});

chrome.commands.onCommand.addListener((command) => {
  if (command !== COMMAND_OPEN_PANEL) return;
  openPanelFromCommand();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== ALARM_PROFILE) return;
  void chrome.notifications.create(ALARM_PROFILE, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title: 'Кабинет',
    message: 'Проверьте профиль',
  });
});

chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    if (sender.origin !== CABINET_ORIGIN) return false;
    if (!isPing(message)) return false;
    sendResponse({ text: 'Расширение на связи' });
    return false;
  },
);

chrome.webRequest.onCompleted.addListener(
  (details) => {
    enqueueGraphql(details.tabId);
  },
  { urls: [...GRAPHQL_URLS] },
);

void restoreBadge();
