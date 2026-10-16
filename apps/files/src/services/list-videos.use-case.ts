import { Injectable } from '@nestjs/common';

import { Metadata } from '@grpc/grpc-js';

import type { ListVideosResponse } from '@libs/proto';

import { toVideoResponse } from '../helpers/video-response';
import { PrismaService } from './prisma.service';

@Injectable()
export class ListVideosUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(_metadata: Metadata): Promise<ListVideosResponse> {
    const videos = await this.prisma.video.findMany({
      where: { status: 'READY' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { videos: videos.map(toVideoResponse) };
  }
}
