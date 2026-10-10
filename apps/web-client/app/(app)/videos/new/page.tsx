import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { isPrefetchRequest } from '@/lib/auth/request-kind';
import { getSession } from '@/lib/auth/session';

import { VideoUploadForm } from './video-upload-form';

export default async function NewVideoPage() {
  const session = await getSession();
  if (!session) {
    if (isPrefetchRequest(await headers())) {
      return null;
    }
    redirect('/login');
  }

  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight text-pretty">
        Загрузить видео
      </h1>
      <VideoUploadForm />
      <Link
        href="/videos"
        prefetch={false}
        className="w-fit font-medium text-zinc-900 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:text-zinc-50 dark:focus-visible:ring-zinc-100"
      >
        К списку видео
      </Link>
    </section>
  );
}
