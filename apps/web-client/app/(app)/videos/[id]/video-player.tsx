import type { VideoQuery } from '@libs/graphql/operations/videos/video.generated';

import { VideoAuthorLine } from '../video-author';
import { PlayingVideo } from './playing-video';

type VideoDetails = NonNullable<VideoQuery['video']>;

export function VideoPlayer({ video }: { video: VideoDetails }) {
  return (
    <article className="flex flex-col gap-4">
      <PlayingVideo src={video.url} title={video.title} />
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-3xl font-semibold tracking-tight text-pretty">
          {video.title}
        </h1>
        {video.description ? (
          <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-200">
            {video.description}
          </p>
        ) : null}
        <VideoAuthorLine author={video.author} />
      </div>
    </article>
  );
}
