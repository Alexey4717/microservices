'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

type PlayingVideoProps = {
  src: string;
  title: string;
};

type PipAction = 'enterpictureinpicture' | 'leavepictureinpicture';

type MediaSessionWithPip = MediaSession & {
  setActionHandler(
    action: PipAction,
    handler: MediaSessionActionHandler | null,
  ): void;
};

function setPipAction(
  action: PipAction,
  handler: MediaSessionActionHandler | null,
) {
  try {
    (navigator.mediaSession as MediaSessionWithPip).setActionHandler(
      action,
      handler,
    );
  } catch {
    return;
  }
}

function syncPlaybackState(video: HTMLVideoElement) {
  if (video.ended) {
    navigator.mediaSession.playbackState = 'none';
    return;
  }

  navigator.mediaSession.playbackState = video.paused ? 'paused' : 'playing';
}

function subscribePictureInPicture() {
  return () => undefined;
}

function pictureInPictureEnabledSnapshot() {
  return document.pictureInPictureEnabled;
}

function pictureInPictureEnabledServerSnapshot() {
  return false;
}

function registerAutoPip(video: HTMLVideoElement, title: string) {
  if (video.paused || video.ended) {
    return;
  }

  if (document.pictureInPictureEnabled === false) {
    return;
  }

  navigator.mediaSession.metadata = new MediaMetadata({ title });
  syncPlaybackState(video);

  setPipAction('enterpictureinpicture', () => {
    if (video.ended || document.pictureInPictureElement === video) {
      return;
    }

    void video.requestPictureInPicture().catch(() => undefined);
  });

  setPipAction('leavepictureinpicture', () => {
    if (document.pictureInPictureElement !== video) {
      return;
    }

    void document.exitPictureInPicture().catch(() => undefined);
  });
}

export function PlayingVideo({ src, title }: PlayingVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pipEnabled = useSyncExternalStore(
    subscribePictureInPicture,
    pictureInPictureEnabledSnapshot,
    pictureInPictureEnabledServerSnapshot,
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const onPlay = () => {
      registerAutoPip(video, title);
    };

    const onPause = () => {
      syncPlaybackState(video);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onPause);

    if (!video.paused) {
      onPlay();
    }

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onPause);
      setPipAction('enterpictureinpicture', null);
      setPipAction('leavepictureinpicture', null);
      navigator.mediaSession.playbackState = 'none';
    };
  }, [src, title]);

  async function togglePip() {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
        return;
      }

      await video.requestPictureInPicture();
    } catch {
      return;
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <video
        ref={videoRef}
        className="aspect-video w-full rounded-2xl bg-black"
        controls
        playsInline
        src={src}
      />
      {pipEnabled ? (
        <button
          type="button"
          onClick={() => {
            void togglePip();
          }}
          className="w-fit rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Мини-окно
        </button>
      ) : null}
    </div>
  );
}
