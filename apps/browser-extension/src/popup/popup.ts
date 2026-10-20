import { cabinetPathname } from '../shared/cabinet-url';
import { ALARM_PROFILE } from '../shared/constants';

const NOT_CABINET = 'Это не страница кабинета';

function requireElement<T extends Element>(id: string): T {
  const element = document.querySelector<T>(`#${id}`);
  if (!element) throw new Error(`Не найден #${id}`);
  return element;
}

async function init(): Promise<void> {
  const path = requireElement<HTMLParagraphElement>('path');
  const status = requireElement<HTMLParagraphElement>('status');
  const openPanel = requireElement<HTMLButtonElement>('open-panel');
  const remind = requireElement<HTMLButtonElement>('remind');

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  const tabId = tab?.id;
  path.textContent = cabinetPathname(tab?.url) ?? NOT_CABINET;

  openPanel.addEventListener('click', () => {
    if (tabId === undefined) {
      status.textContent = 'Не удалось открыть панель';
      return;
    }

    void Promise.resolve(chrome.sidePanel.open({ tabId })).catch(() => {
      status.textContent = 'Не удалось открыть панель';
    });
  });

  remind.addEventListener('click', () => {
    void Promise.resolve(
      chrome.alarms.create(ALARM_PROFILE, { delayInMinutes: 1 }),
    )
      .then(() => {
        status.textContent = 'Напоминание через минуту';
      })
      .catch(() => {
        status.textContent = 'Не удалось поставить напоминание';
      });
  });
}

void init();
