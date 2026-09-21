import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';

import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  BROWSER_GATE_MESSAGE,
  GateScreen,
  REPLY_KEYBOARD_GATE_MESSAGE,
} from './components/GateScreen';
import './index.css';
import {
  bootstrapTelegram,
  getInitData,
  isTelegramClient,
  miniAppInitialPath,
  signalTelegramReady,
} from './telegram';

bootstrapTelegram();

const root = document.getElementById('root');
if (!root) {
  throw new Error('Не найден элемент #root');
}

const initData = getInitData();
const tree = initData ? (
  <MemoryRouter initialEntries={[miniAppInitialPath()]}>
    <App />
  </MemoryRouter>
) : (
  <GateScreen
    message={
      isTelegramClient() ? REPLY_KEYBOARD_GATE_MESSAGE : BROWSER_GATE_MESSAGE
    }
  />
);

try {
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>{tree}</ErrorBoundary>
    </StrictMode>,
  );
} catch (caught) {
  signalTelegramReady();
  root.textContent =
    caught instanceof Error && caught.message.trim()
      ? caught.message
      : 'Не удалось открыть кабинет.';
}
