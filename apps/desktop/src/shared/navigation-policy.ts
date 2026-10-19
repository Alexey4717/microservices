import { isTrustedSenderUrl } from './sender-url';

export type NavigationDecision =
  | { action: 'allow' }
  | { action: 'external'; url: string }
  | { action: 'deny' };

export function classifyNavigation(
  targetUrl: string,
  packagedIndexUrl: string,
): NavigationDecision {
  const trimmed = targetUrl.trim();
  if (!trimmed) {
    return { action: 'deny' };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { action: 'deny' };
  }

  if (url.username || url.password) {
    return { action: 'deny' };
  }

  if (isTrustedSenderUrl(trimmed, packagedIndexUrl)) {
    return { action: 'allow' };
  }

  if (url.protocol === 'http:' || url.protocol === 'https:') {
    return { action: 'external', url: url.href };
  }

  return { action: 'deny' };
}
