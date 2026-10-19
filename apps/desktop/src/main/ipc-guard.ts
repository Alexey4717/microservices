import { type IpcMainInvokeEvent } from 'electron';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { isTrustedSenderUrl } from '../shared/sender-url';

export function packagedIndexUrl(): string {
  return pathToFileURL(join(__dirname, '../renderer/index.html')).href;
}

export function assertTrustedIpc(event: IpcMainInvokeEvent): void {
  const frameUrl = event.senderFrame?.url;
  if (!isTrustedSenderUrl(frameUrl, packagedIndexUrl())) {
    throw new Error('Недоверенный источник вызова');
  }
}
