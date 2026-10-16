import { Metadata } from '@grpc/grpc-js';
import { describe, expect, it, vi } from 'vitest';

import { CompleteVideoUploadUseCase } from './complete-video-upload.use-case';
import { CreateVideoUploadUseCase } from './create-video-upload.use-case';
import { GetVideoUseCase } from './get-video.use-case';
import { ListVideosUseCase } from './list-videos.use-case';

function metadataWithoutUser(): Metadata {
  return new Metadata();
}

describe('Videos use-cases public reads', () => {
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
    const listVideos = new ListVideosUseCase({
      video: { findMany, findUnique },
    } as never);
    const getVideo = new GetVideoUseCase({
      video: { findMany, findUnique },
    } as never);

    const list = await listVideos.execute(metadataWithoutUser());
    expect(list.videos).toHaveLength(1);
    expect(findMany).toHaveBeenCalled();

    const one = await getVideo.execute({ id: 'v1' }, metadataWithoutUser());
    expect(one.id).toBe('v1');
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'v1' } });
  });

  it('createVideoUpload без user-id падает', async () => {
    const create = vi.fn();
    const createVideoUpload = new CreateVideoUploadUseCase(
      { video: { create } } as never,
      {} as never,
    );

    await expect(
      createVideoUpload.execute(
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
    const completeVideoUpload = new CompleteVideoUploadUseCase(
      { video: { findUnique } } as never,
      {} as never,
    );

    await expect(
      completeVideoUpload.execute({ id: 'v1' }, metadataWithoutUser()),
    ).rejects.toBeTruthy();
    expect(findUnique).not.toHaveBeenCalled();
  });
});
