'use client';

import { useQuery } from '@apollo/client/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AiConversationsDocument } from '@libs/graphql/operations/ai-assistant/ai-conversations.generated';

import { AiAssistantChat } from './ai-assistant/ai-assistant-chat';

const SIZE_STORAGE_KEY = 'ai-assistant-panel-size';
const REM = 16;
const DEFAULT_WIDTH = 40 * REM;
const DEFAULT_HEIGHT = 32 * REM;
const MIN_WIDTH = 20 * REM;
const MIN_HEIGHT = 20 * REM;
const VIEWPORT_MARGIN_X = 2 * REM;
const VIEWPORT_MARGIN_Y = 5.5 * REM;

type PanelSize = {
  width: number;
  height: number;
};

type AiAssistantPanelProps = {
  showPanel: boolean;
  focusCloseRef: { current: boolean };
  onClose: () => void;
};

export function AiAssistantPanel({
  showPanel,
  focusCloseRef,
  onClose,
}: AiAssistantPanelProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [size, setSize] = useState<PanelSize>(() =>
    clampSize(readStoredSize()),
  );
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  const conversationsQuery = useQuery(AiConversationsDocument, {
    skip: !showPanel,
  });
  const conversations = conversationsQuery.data?.aiConversations;
  const loadError = conversationsQuery.error;

  const closePanel = useCallback(() => {
    setFullscreen(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    function onResize() {
      setSize((current) => clampSize(current));
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (fullscreen) {
      return;
    }
    writeStoredSize(size);
  }, [fullscreen, size]);

  useEffect(() => {
    if (!showPanel || !focusCloseRef.current) {
      return;
    }
    focusCloseRef.current = false;
    closeRef.current?.focus();
  }, [focusCloseRef, showPanel]);

  useEffect(() => {
    if (!showPanel) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return;
      }
      if (fullscreen) {
        setFullscreen(false);
        return;
      }
      closePanel();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closePanel, fullscreen, showPanel]);

  useEffect(() => {
    function onPointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      setSize(
        clampSize({
          width: drag.startWidth + (drag.startX - event.clientX),
          height: drag.startHeight + (drag.startY - event.clientY),
        }),
      );
    }

    function onPointerUp() {
      dragRef.current = null;
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const panelStyle = fullscreen
    ? undefined
    : {
        width: size.width,
        height: size.height,
      };

  return (
    <section
      className={
        showPanel
          ? fullscreen
            ? 'fixed inset-2 z-40 flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900 sm:inset-4'
            : 'fixed right-4 bottom-4 z-40 flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900'
          : 'hidden'
      }
      style={showPanel && !fullscreen ? panelStyle : undefined}
      role="dialog"
      aria-label="Чат с ИИ-ассистентом"
      aria-hidden={showPanel ? undefined : true}
      inert={showPanel ? undefined : true}
      aria-busy={
        conversationsQuery.loading && !conversations ? true : undefined
      }
    >
      {!fullscreen && showPanel ? (
        <button
          type="button"
          className="absolute top-0 left-0 z-10 h-4 w-4 cursor-nw-resize touch-none rounded-br-md border-r border-b border-zinc-300 bg-zinc-100/90 dark:border-zinc-700 dark:bg-zinc-800/90"
          aria-label="Изменить размер панели"
          onPointerDown={(event) => {
            event.preventDefault();
            dragRef.current = {
              startX: event.clientX,
              startY: event.clientY,
              startWidth: size.width,
              startHeight: size.height,
            };
          }}
        />
      ) : null}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">ИИ-ассистент</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            aria-label={
              fullscreen
                ? 'Выйти из полноэкранного режима'
                : 'Открыть на весь экран'
            }
            onClick={() => setFullscreen((current) => !current)}
          >
            {fullscreen ? 'Свернуть' : 'На весь экран'}
          </button>
          <button
            ref={closeRef}
            type="button"
            className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            aria-label="Закрыть чат"
            onClick={closePanel}
          >
            Закрыть
          </button>
        </div>
      </header>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {conversations ? (
          <AiAssistantChat initialConversations={conversations} />
        ) : (
          <div className="flex flex-1 flex-col gap-3 p-4">
            <p className="text-sm text-zinc-500">
              {loadError
                ? loadError.message || 'Не удалось загрузить диалоги'
                : 'Загрузка диалогов…'}
            </p>
            {loadError ? (
              <button
                type="button"
                className="self-start rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                onClick={() => {
                  void conversationsQuery.refetch();
                }}
              >
                Повторить
              </button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function clampSize(next: PanelSize): PanelSize {
  if (typeof window === 'undefined') {
    return next;
  }
  const maxWidth = Math.max(MIN_WIDTH, window.innerWidth - VIEWPORT_MARGIN_X);
  const maxHeight = Math.max(
    MIN_HEIGHT,
    window.innerHeight - VIEWPORT_MARGIN_Y,
  );
  return {
    width: Math.min(maxWidth, Math.max(MIN_WIDTH, next.width)),
    height: Math.min(maxHeight, Math.max(MIN_HEIGHT, next.height)),
  };
}

function readStoredSize(): PanelSize {
  if (typeof window === 'undefined') {
    return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  }
  try {
    const raw = window.localStorage.getItem(SIZE_STORAGE_KEY);
    if (!raw) {
      return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
    }
    const parsed = JSON.parse(raw) as Partial<PanelSize>;
    if (
      typeof parsed.width !== 'number' ||
      typeof parsed.height !== 'number' ||
      !Number.isFinite(parsed.width) ||
      !Number.isFinite(parsed.height)
    ) {
      return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
    }
    return { width: parsed.width, height: parsed.height };
  } catch {
    return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  }
}

function writeStoredSize(size: PanelSize): void {
  try {
    window.localStorage.setItem(SIZE_STORAGE_KEY, JSON.stringify(size));
  } catch {
    // ignore quota / private mode
  }
}
