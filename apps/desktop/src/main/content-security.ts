import { app, session } from 'electron';

import {
  buildPackagedCsp,
  withContentSecurityPolicy,
} from '../shared/content-security-policy';
import { resolveGraphqlUrl } from '../shared/graphql-url';

export function installPackagedContentSecurityPolicy(): void {
  if (!app.isPackaged) {
    return;
  }

  const policy = buildPackagedCsp(
    resolveGraphqlUrl(import.meta.env.MAIN_VITE_GRAPHQL_URL),
  );

  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['file://*/*'] },
    (details, callback) => {
      callback({
        responseHeaders: withContentSecurityPolicy(
          details.responseHeaders,
          policy,
        ),
      });
    },
  );
}
