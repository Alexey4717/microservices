import { describe, expect, it, vi } from 'vitest';

import type { VideoResponse } from '@libs/proto';

import {
  executeGetVideo,
  executeListVideos,
  takeLatestVideos,
} from './video-tool';

function video(id: string, createdAt: string): VideoResponse {
  return {
    id,
    ownerUserId: 'owner',
    title: `Title ${id}`,
    description: '',
    url: `http://example/${id}.mp4`,
    mimeType: 'video/mp4',
    size: 10,
    createdAt,
  };
}

describe('get_video', () => {
  it('берёт id из аргументов', async () => {
    const getVideo = vi
      .fn()
      .mockResolvedValue(video('v1', '2026-01-02T00:00:00.000Z'));

    const raw = await executeGetVideo(
      { id: 'v1' },
      { userId: 'owner', internalToken: 'token', pagePath: '/videos' },
      getVideo,
    );

    expect(getVideo).toHaveBeenCalledWith('v1', 'token');
    expect(JSON.parse(raw)).toMatchObject({ id: 'v1', title: 'Title v1' });
  });

  it('если id нет — берёт UUID из pagePath', async () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    const getVideo = vi
      .fn()
      .mockResolvedValue(video(id, '2026-01-02T00:00:00.000Z'));

    await executeGetVideo(
      {},
      {
        userId: 'owner',
        internalToken: 'token',
        pagePath: `/videos/${id}`,
      },
      getVideo,
    );

    expect(getVideo).toHaveBeenCalledWith(id, 'token');
  });

  it('без id и без pagePath возвращает ошибку без вызова gRPC', async () => {
    const getVideo = vi.fn();

    const raw = await executeGetVideo(
      {},
      { userId: 'owner', internalToken: 'token', pagePath: '/videos' },
      getVideo,
    );

    expect(getVideo).not.toHaveBeenCalled();
    const parsed = JSON.parse(raw) as { error: string };
    expect(parsed.error).toEqual(expect.any(String));
  });
});

describe('list_videos', () => {
  it('возвращает не больше 20 последних', async () => {
    const videos = Array.from({ length: 25 }, (_, index) =>
      video(`v${index}`, new Date(Date.UTC(2026, 0, index + 1)).toISOString()),
    );
    const listVideos = vi.fn().mockResolvedValue(videos);

    const raw = await executeListVideos(
      {},
      { userId: 'owner', internalToken: 'token' },
      listVideos,
    );

    expect(listVideos).toHaveBeenCalledWith('token');
    const parsed = JSON.parse(raw) as VideoResponse[];
    expect(parsed).toHaveLength(20);
    expect(parsed[0]?.id).toBe('v24');
    expect(takeLatestVideos(videos)).toHaveLength(20);
  });
});
