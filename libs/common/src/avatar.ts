export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export const AVATAR_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type AvatarMimeType = (typeof AVATAR_ALLOWED_MIME_TYPES)[number];

const AVATAR_EXTENSIONS: Record<AvatarMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function isAllowedAvatarMime(
  mimeType: string,
): mimeType is AvatarMimeType {
  return (AVATAR_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function avatarExtension(mimeType: string): string | undefined {
  if (!isAllowedAvatarMime(mimeType)) {
    return undefined;
  }
  return AVATAR_EXTENSIONS[mimeType];
}
