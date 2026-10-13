'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { AiAssistantPanel } from './ai-assistant-panel';

export function AiAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const focusClose = useRef(false);
  const restoreLauncherFocus = useRef(false);

  const closePanel = useCallback(() => {
    restoreLauncherFocus.current = true;
    setOpen(false);
  }, []);

  function openPanel() {
    focusClose.current = true;
    setEngaged(true);
    setOpen(true);
  }

  useEffect(() => {
    if (open || !restoreLauncherFocus.current) {
      return;
    }
    restoreLauncherFocus.current = false;
    launcherRef.current?.focus();
  }, [open]);

  return (
    <>
      {engaged ? (
        <AiAssistantPanel
          showPanel={open}
          focusCloseRef={focusClose}
          onClose={closePanel}
        />
      ) : null}
      {!open ? (
        <button
          ref={launcherRef}
          type="button"
          className="fixed right-4 bottom-4 z-40 rounded-full bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          aria-label="Открыть чат с ИИ-ассистентом"
          onClick={openPanel}
        >
          Ассистент
        </button>
      ) : null}
    </>
  );
}
