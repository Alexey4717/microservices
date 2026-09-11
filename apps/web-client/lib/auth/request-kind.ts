export function isServerActionRequest(headerStore: Headers): boolean {
  return headerStore.has('next-action');
}

export function isPrefetchRequest(headerStore: Headers): boolean {
  const purpose = headerStore.get('purpose');
  const secPurpose = headerStore.get('sec-purpose');

  return (
    headerStore.has('next-router-prefetch') ||
    purpose === 'prefetch' ||
    Boolean(secPurpose?.includes('prefetch'))
  );
}
