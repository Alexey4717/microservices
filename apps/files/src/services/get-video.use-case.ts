import { Injectable } from '@nestjs/common';

import { Metadata } from '@grpc/grpc-js';

import type { GetVideoRequest, VideoResponse } from '@libs/proto';

import { notFound, toVideoResponse } from '../helpers/video-response';
import { PrismaService } from './prisma.service';

@Injectable()
export class GetVideoUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    data: GetVideoRequest,
    _metadata: Metadata,
  ): Promise<VideoResponse> {
    const id = data.id?.trim() ?? '';
    const video = id
      ? await this.prisma.video.findUnique({ where: { id } })
      : null;
    if (!video || video.status !== 'READY') {
      throw notFound();
    }
    return toVideoResponse(video);
  }
}
