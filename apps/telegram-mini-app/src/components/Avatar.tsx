type AvatarProps = {
  src?: string | null;
  alt: string;
  name?: string | null;
};

export function Avatar({ src, alt, name }: AvatarProps) {
  if (src) {
    return (
      <img className="avatar" src={src} alt={alt} width={64} height={64} />
    );
  }

  const letter = (name?.trim()?.[0] || alt.trim()[0] || '?').toLocaleUpperCase(
    'ru-RU',
  );

  return (
    <span className="avatar-fallback" role="img" aria-label={alt}>
      {letter}
    </span>
  );
}
