export function isGraphqlSseRequest(req: {
  headers: { accept?: string | string[] };
}): boolean {
  const accept = req.headers.accept;
  const value = Array.isArray(accept) ? accept.join(',') : (accept ?? '');
  return value
    .split(',')
    .some((part) => part.trim().toLowerCase().startsWith('text/event-stream'));
}
