const VIDEO_ID_PATH =
  /^\/videos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPublicAppPath(pathname: string): boolean {
  return pathname === '/videos' || VIDEO_ID_PATH.test(pathname);
}
