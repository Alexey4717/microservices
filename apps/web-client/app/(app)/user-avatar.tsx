'use client';

import Image from 'next/image';

type UserAvatarProps = {
  src?: string | null;
  alt: string;
  size: number;
  name?: string | null;
  priority?: boolean;
};

function avatarLoader({ src }: { src: string }) {
  return src;
}

export function UserAvatar({
  src,
  alt,
  size,
  name,
  priority = false,
}: UserAvatarProps) {
  const className =
    'shrink-0 rounded-full bg-zinc-200 object-cover dark:bg-zinc-800';

  if (src) {
    if (src.startsWith('blob:')) {
      return (
        // Object-URL preview; next/image does not accept blob: sources.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          width={size}
          height={size}
          className={className}
        />
      );
    }

    return (
      <Image
        loader={avatarLoader}
        src={src}
        alt={alt}
        width={size}
        height={size}
        sizes={`${size}px`}
        unoptimized
        priority={priority}
        className={className}
        style={{ width: size, height: size }}
      />
    );
  }

  const letter = (name?.trim()?.[0] || alt.trim()[0] || '?').toLocaleUpperCase(
    'ru-RU',
  );

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-medium text-zinc-600 dark:text-zinc-300 ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      role="img"
      aria-label={alt}
    >
      {letter}
    </span>
  );
}
