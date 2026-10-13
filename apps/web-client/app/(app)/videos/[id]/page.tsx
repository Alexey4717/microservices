import type { Metadata } from 'next';
import Link from 'next/link';

import { VideoDocument } from '@libs/graphql/operations/videos/video.generated';

import { query } from '@/lib/apollo/server';

import { VideoPlayer } from './video-player';

type VideoPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: VideoPageProps): Promise<Metadata> {
  const { id } = await params;
  const video = await loadVideo(id);
  if (!video) {
    return { title: 'Видео' };
  }

  const description = video.description?.trim();
  return {
    title: video.title,
    ...(description ? { description } : {}),
  };
}

export default async function VideoPage({ params }: VideoPageProps) {
  const { id } = await params;
  const video = await loadVideo(id);
  if (!video) {
    return <VideoNotFound />;
  }

  return <VideoPlayer video={video} />;
}

async function loadVideo(id: string) {
  const result = await query({
    query: VideoDocument,
    variables: { id },
  }).catch(() => null);
  return result?.data?.video ?? null;
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
