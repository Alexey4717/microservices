import { emptyToNull } from '@libs/common';
import type { UserResponse, VideoResponse } from '@libs/proto';

import { Video, VideoAuthor } from '../models/video.model';

export function toVideoAuthor(
  ownerUserId: string,
  projection: UserResponse | null,
): VideoAuthor {
  if (!projection) {
    return { id: ownerUserId, name: null, avatarUrl: null };
  }

  return {
    id: projection.id || ownerUserId,
    name: emptyToNull(projection.name),
    avatarUrl: emptyToNull(projection.avatarUrl),
  };
}

export function toVideoModel(video: VideoResponse, author: VideoAuthor): Video {
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    url: video.url,
    mimeType: video.mimeType,
    size: Number(video.size),
    createdAt: video.createdAt,
    author,
  };
}
