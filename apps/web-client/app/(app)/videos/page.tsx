import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { VideosDocument } from '@libs/graphql/operations/videos/videos.generated';

import { query } from '@/lib/apollo/server';
import { isPrefetchRequest } from '@/lib/auth/request-kind';
import { getSession } from '@/lib/auth/session';

import { VideoGrid } from './video-grid';

export default async function VideosPage() {
  const session = await getSession();
  if (!session) {
    if (isPrefetchRequest(await headers())) {
      return null;
    }
    redirect('/login');
  }

  const result = await query({ query: VideosDocument }).catch(() => null);
  const videos = result?.data?.videos;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-pretty">
          Видео
        </h1>
        <Link
          href="/videos/new"
          prefetch={false}
          className="font-medium text-zinc-900 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:text-zinc-50 dark:focus-visible:ring-zinc-100"
        >
          Загрузить видео
        </Link>
      </div>
      {videos ? (
        <VideoGrid videos={videos} />
      ) : (
        <p className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          Не удалось загрузить список видео.
        </p>
      )}
    </section>
  );
}
