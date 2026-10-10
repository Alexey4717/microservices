import { UserAvatar } from '../user-avatar';

export type VideoAuthorView = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

export function VideoAuthorLine({ author }: { author: VideoAuthorView }) {
  const name = author.name?.trim() || 'Без имени';

  return (
    <div className="flex min-w-0 items-center gap-2">
      <UserAvatar
        src={author.avatarUrl}
        alt={`Автор ${name}`}
        size={32}
        name={name}
      />
      <span className="min-w-0 truncate text-sm text-zinc-600 dark:text-zinc-400">
        {name}
      </span>
    </div>
  );
}
