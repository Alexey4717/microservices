import { emptyToNull } from '@libs/common';
import type { UserResponse, VideoResponse } from '@libs/proto';

import { VideoAuthor } from '../models/video.model';

export type VideoParent = {
  id: string;
  title: string;
  description: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: string;
  ownerUserId: string;
};

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

export function toVideoParent(video: VideoResponse): VideoParent {
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    url: video.url,
    mimeType: video.mimeType,
    size: Number(video.size),
    createdAt: video.createdAt,
    ownerUserId: video.ownerUserId,
  };
}
