import { GUARDS_METADATA } from '@nestjs/common/constants';

import { GraphQLError } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserResponse, VideoResponse } from '@libs/proto';

import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { VideoAuthorLoader } from '../loaders/video-author.loader';
import type { GqlContext } from '../types/gql-context';
import { VideosResolver } from './videos.resolver';

describe('VideosResolver auth', () => {
  it('оставляет CUD под GqlAuthGuard', () => {
    for (const name of ['createVideoUpload', 'completeVideoUpload'] as const) {
      const method = (
        VideosResolver.prototype as unknown as Record<string, unknown>
      )[name];
      const guards = Reflect.getMetadata(GUARDS_METADATA, method as object) as
        unknown[] | undefined;
      expect(guards).toEqual(expect.arrayContaining([GqlAuthGuard]));
    }
  });

  it('делает videos и video публичными', () => {
    for (const name of ['videos', 'video'] as const) {
      const method = (
        VideosResolver.prototype as unknown as Record<string, unknown>
      )[name];
      const guards = Reflect.getMetadata(GUARDS_METADATA, method as object) as
        unknown[] | undefined;
      expect(guards ?? []).not.toEqual(expect.arrayContaining([GqlAuthGuard]));
    }
  });
});

describe('VideosResolver author', () => {
  const findByIds = vi.fn();
  const listVideos = vi.fn();
  const getVideo = vi.fn();
  const completeVideoUpload = vi.fn();

  function resolver(): VideosResolver {
    return new VideosResolver(
      {
        listVideos,
        getVideo,
        completeVideoUpload,
      } as never,
      new VideoAuthorLoader({ findByIds } as never),
      { getOrThrow: () => 'token' } as never,
    );
  }

  function context(): GqlContext {
    return { req: {}, res: {} } as GqlContext;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    findByIds.mockImplementation((ids: readonly string[]) => {
      const known = new Map<string, UserResponse>([
        [
          'u2',
          {
            id: 'u2',
            email: 'two@example.com',
            name: 'Two',
            avatarUrl: 'https://cdn/u2.png',
            accountTier: 'BASE',
          },
        ],
        [
          'u1',
          {
            id: 'u1',
            email: 'one@example.com',
            name: 'One',
            avatarUrl: '',
            accountTier: 'BASE',
          },
        ],
      ]);
      return [...ids].reverse().flatMap((id) => {
        const projection = known.get(id);
        return projection ? [projection] : [];
      });
    });
  });

  it('батчит авторов одного запроса: порядок ключей, повтор и пустая проекция', async () => {
    listVideos.mockResolvedValue({
      videos: [
        video('v1', 'u2'),
        video('v2', 'u1'),
        video('v3', 'u2'),
        video('v4', 'gone'),
      ],
    });

    const videosResolver = resolver();
    const parents = await videosResolver.videos();

    expect(parents).toEqual([
      expect.objectContaining({ id: 'v1', ownerUserId: 'u2' }),
      expect.objectContaining({ id: 'v2', ownerUserId: 'u1' }),
      expect.objectContaining({ id: 'v3', ownerUserId: 'u2' }),
      expect.objectContaining({ id: 'v4', ownerUserId: 'gone' }),
    ]);
    expect(parents.every((parent) => !('author' in parent))).toBe(true);
    expect(findByIds).not.toHaveBeenCalled();

    const gqlContext = context();
    const authors = await Promise.all(
      parents.map((parent) => videosResolver.author(parent, gqlContext)),
    );

    expect(findByIds).toHaveBeenCalledTimes(1);
    expect(findByIds).toHaveBeenCalledWith(['u2', 'u1', 'gone']);
    expect(authors).toEqual([
      { id: 'u2', name: 'Two', avatarUrl: 'https://cdn/u2.png' },
      { id: 'u1', name: 'One', avatarUrl: null },
      { id: 'u2', name: 'Two', avatarUrl: 'https://cdn/u2.png' },
      { id: 'gone', name: null, avatarUrl: null },
    ]);

    await videosResolver.author(parents[0], gqlContext);
    expect(findByIds).toHaveBeenCalledTimes(1);

    await videosResolver.author(parents[0], context());
    expect(findByIds).toHaveBeenCalledTimes(2);
  });

  it('не грузит автора, пока поле не резолвится', async () => {
    getVideo.mockResolvedValue(video('v1', 'u1'));
    completeVideoUpload.mockResolvedValue(video('v2', 'u2'));

    const videosResolver = resolver();
    await expect(videosResolver.video('v1')).resolves.toEqual(
      expect.objectContaining({ id: 'v1', ownerUserId: 'u1' }),
    );
    await expect(
      videosResolver.completeVideoUpload('v2', {
        userId: 'u2',
        email: 'two@example.com',
      }),
    ).resolves.toEqual(
      expect.objectContaining({ id: 'v2', ownerUserId: 'u2' }),
    );
    expect(findByIds).not.toHaveBeenCalled();
  });

  it('video возвращает null, если видео нет', async () => {
    getVideo.mockRejectedValue(
      new GraphQLError('missing', { extensions: { code: 'NOT_FOUND' } }),
    );
    await expect(resolver().video('missing')).resolves.toBeNull();
  });
});

function video(id: string, ownerUserId: string): VideoResponse {
  return {
    id,
    ownerUserId,
    title: id,
    description: '',
    url: `https://cdn/${id}`,
    mimeType: 'video/mp4',
    size: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}
