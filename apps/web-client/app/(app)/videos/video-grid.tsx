import Link from 'next/link';

import type { VideosQuery } from '@libs/graphql/operations/videos/videos.generated';

import { VideoAuthorLine } from './video-author';

type CatalogVideo = VideosQuery['videos'][number];

export function VideoGrid({ videos }: { videos: CatalogVideo[] }) {
  if (videos.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Видео пока нет.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {videos.map((video) => (
        <li key={video.id}>
          <Link
            href={`/videos/${video.id}`}
            prefetch={false}
            className="block overflow-hidden rounded-2xl border border-zinc-200 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:focus-visible:ring-zinc-100"
          >
            <video
              className="pointer-events-none aspect-video w-full bg-black object-cover"
              muted
              preload="metadata"
              playsInline
              src={video.url}
              aria-hidden="true"
            />
            <div className="flex flex-col gap-3 p-6">
              <h2 className="text-lg font-semibold tracking-tight text-pretty">
                {video.title}
              </h2>
              <VideoAuthorLine author={video.author} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
