import { Injectable } from '@nestjs/common';

import type { VideoResponse } from '@libs/proto';

import { FilesGrpcService } from './files-grpc.service';
import { videoIdFromPagePath } from './focused-entity';
import { GET_VIDEO_TOOL, LIST_VIDEOS_TOOL } from './tool-definitions';
import { type AssistantTool, type ToolSession } from './tool-types';

export const LIST_VIDEOS_TOOL_LIMIT = 20;

export type VideoToolSnapshot = {
  id: string;
  title: string;
  description: string;
  url: string;
  ownerUserId: string;
  createdAt: string;
};

export function toVideoToolSnapshot(video: VideoResponse): VideoToolSnapshot {
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    url: video.url,
    ownerUserId: video.ownerUserId,
    createdAt: video.createdAt,
  };
}

export function takeLatestVideos<T extends { createdAt: string }>(
  videos: readonly T[],
  limit = LIST_VIDEOS_TOOL_LIMIT,
): T[] {
  return [...videos]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, limit);
}

function readVideoIdArg(args: unknown): string {
  if (!args || typeof args !== 'object') {
    return '';
  }
  const id = (args as { id?: unknown }).id;
  return typeof id === 'string' ? id.trim() : '';
}

export async function executeGetVideo(
  args: unknown,
  session: ToolSession,
  getVideo: (id: string, internalToken: string) => Promise<VideoResponse>,
): Promise<string> {
  const fromArgs = readVideoIdArg(args);
  const id = fromArgs || videoIdFromPagePath(session.pagePath) || '';
  if (!id) {
    return JSON.stringify({
      error:
        'Не указан id видео. Передайте id или откройте страницу /videos/:id.',
    });
  }

  const video = await getVideo(id, session.internalToken);
  return JSON.stringify(toVideoToolSnapshot(video));
}

export async function executeListVideos(
  _args: unknown,
  session: ToolSession,
  listVideos: (internalToken: string) => Promise<VideoResponse[]>,
): Promise<string> {
  const videos = await listVideos(session.internalToken);
  return JSON.stringify(
    takeLatestVideos(videos).map((video) => toVideoToolSnapshot(video)),
  );
}

@Injectable()
export class GetVideoTool implements AssistantTool {
  readonly name = GET_VIDEO_TOOL.name;
  readonly description = GET_VIDEO_TOOL.description;
  readonly parameters = GET_VIDEO_TOOL.parameters;

  constructor(private readonly files: FilesGrpcService) {}

  execute(args: unknown, session: ToolSession): Promise<string> {
    return executeGetVideo(args, session, (id, internalToken) =>
      this.files.getVideo(id, internalToken),
    );
  }
}

@Injectable()
export class ListVideosTool implements AssistantTool {
  readonly name = LIST_VIDEOS_TOOL.name;
  readonly description = LIST_VIDEOS_TOOL.description;
  readonly parameters = LIST_VIDEOS_TOOL.parameters;

  constructor(private readonly files: FilesGrpcService) {}

  execute(args: unknown, session: ToolSession): Promise<string> {
    return executeListVideos(args, session, (internalToken) =>
      this.files.listVideos(internalToken),
    );
  }
}
