import { Metadata } from '@grpc/grpc-js';
import { describe, expect, it, vi } from 'vitest';

import { VideosService } from './videos.service';

function metadataWithoutUser(): Metadata {
  return new Metadata();
}

describe('VideosService public reads', () => {
  it('listVideos и getVideo не требуют user-id', async () => {
    const ready = {
      id: 'v1',
      ownerUserId: 'owner',
      title: 'T',
      description: 'D',
      url: 'http://example/v1.mp4',
      mimeType: 'video/mp4',
      size: 10,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      status: 'READY' as const,
      objectKey: 'owner/v1.mp4',
    };
    const findMany = vi.fn().mockResolvedValue([ready]);
    const findUnique = vi.fn().mockResolvedValue(ready);
    const service = new VideosService(
      { video: { findMany, findUnique } } as never,
      {} as never,
    );

    const list = await service.listVideos(metadataWithoutUser());
    expect(list.videos).toHaveLength(1);
    expect(findMany).toHaveBeenCalled();

    const one = await service.getVideo({ id: 'v1' }, metadataWithoutUser());
    expect(one.id).toBe('v1');
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'v1' } });
  });

  it('createVideoUpload без user-id падает', async () => {
    const create = vi.fn();
    const service = new VideosService(
      { video: { create } } as never,
      {} as never,
    );

    await expect(
      service.createVideoUpload(
        {
          title: 'T',
          description: '',
          filename: 'a.mp4',
          mimeType: 'video/mp4',
          size: 10,
        },
        metadataWithoutUser(),
      ),
    ).rejects.toBeTruthy();
    expect(create).not.toHaveBeenCalled();
  });

  it('completeVideoUpload без user-id падает', async () => {
    const findUnique = vi.fn();
    const service = new VideosService(
      { video: { findUnique } } as never,
      {} as never,
    );

    await expect(
      service.completeVideoUpload({ id: 'v1' }, metadataWithoutUser()),
    ).rejects.toBeTruthy();
    expect(findUnique).not.toHaveBeenCalled();
  });
});
