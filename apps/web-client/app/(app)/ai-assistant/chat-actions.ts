import type { ChatAction, ConversationAction } from './chat-model';

export function toActionCards(actions: ConversationAction[]): ChatAction[] {
  return actions
    .filter((action) => action.status === 'pending')
    .map((action) => ({
      id: action.id,
      type: action.type,
      title: action.title,
      status: 'pending',
      busy: false,
      error: null,
    }));
}

export function upsertAction(
  actions: ChatAction[],
  action: { id: string; type: string; title: string },
): ChatAction[] {
  if (actions.some((item) => item.id === action.id)) {
    return actions;
  }
  return [
    ...actions,
    {
      ...action,
      status: 'pending',
      busy: false,
      error: null,
    },
  ];
}

export function mergeActions(
  current: ChatAction[],
  pending: ChatAction[],
): ChatAction[] {
  const pendingIds = new Set(pending.map((action) => action.id));
  const resolved = current.filter(
    (action) => action.status !== 'pending' && !pendingIds.has(action.id),
  );
  const keptPending = pending.map((action) => {
    const existing = current.find((item) => item.id === action.id);
    return existing?.busy
      ? { ...action, busy: true, error: existing.error }
      : action;
  });
  return [...keptPending, ...resolved];
}

export function markAction(
  actions: ChatAction[],
  id: string,
  patch: Partial<Pick<ChatAction, 'busy' | 'error' | 'status'>>,
): ChatAction[] {
  return actions.map((action) =>
    action.id === id ? { ...action, ...patch } : action,
  );
}

export function openCheckout(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return;
  }
  const href = parsed.toString();
  const opened = window.open(href, '_blank', 'noopener,noreferrer');
  if (!opened) {
    window.location.assign(href);
  }
}
