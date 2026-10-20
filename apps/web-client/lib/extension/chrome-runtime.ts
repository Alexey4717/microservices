export type ExtensionPingResponse = {
  text?: string;
};

type PageRuntime = {
  lastError?: { message?: string };
  sendMessage: (
    extensionId: string,
    message: { type: 'ping' },
    responseCallback: (response: ExtensionPingResponse | undefined) => void,
  ) => void;
};

type PageChrome = {
  runtime?: PageRuntime;
};

export function pageChrome(target: Window): PageChrome | undefined {
  const host = target as unknown as { chrome?: PageChrome };
  const value = host.chrome;
  if (typeof value !== 'object' || value === null) return undefined;
  return value;
}
