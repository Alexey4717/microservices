import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { VideoDocument } from '@libs/graphql/operations/videos/video.generated';

import { query } from '@/lib/apollo/server';
import { isPrefetchRequest } from '@/lib/auth/request-kind';
import { getSession } from '@/lib/auth/session';

import { VideoPlayer } from './video-player';

type VideoPageProps = {
  params: Promise<{ id: string }>;
};

export default async function VideoPage({ params }: VideoPageProps) {
  const session = await getSession();
  if (!session) {
    if (isPrefetchRequest(await headers())) {
      return null;
    }
    redirect('/login');
  }

  const { id } = await params;
  const result = await query({
    query: VideoDocument,
    variables: { id },
  }).catch(() => null);
  const video = result?.data?.video;
  if (!video) {
    return <VideoNotFound />;
  }

  return <VideoPlayer video={video} />;
}

function VideoNotFound() {
  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight text-pretty">
        Видео
      </h1>
      <p className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
        Видео не найдено
      </p>
      <Link
        href="/videos"
        prefetch={false}
        className="w-fit font-medium text-zinc-900 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:text-zinc-50 dark:focus-visible:ring-zinc-100"
      >
        Вернуться к видео
      </Link>
    </section>
  );
}
