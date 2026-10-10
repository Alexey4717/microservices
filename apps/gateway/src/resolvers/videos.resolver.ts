import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';

import { GraphQLError } from 'graphql';

import type { UserResponse, VideoResponse } from '@libs/proto';

import { CurrentUser } from '../decorators/current-user.decorator';
import { CreateVideoUploadInput } from '../dto/create-video-upload.input';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { toVideoAuthor, toVideoModel } from '../mappers/video.mapper';
import { VideoUpload } from '../models/video-upload.model';
import { Video } from '../models/video.model';
import { FilesGrpcService } from '../services/files-grpc.service';
import { UserProjectionService } from '../services/user-projection.service';
import type { AuthenticatedUser } from '../types/auth.types';

@Resolver()
export class VideosResolver {
  constructor(
    private readonly filesGrpc: FilesGrpcService,
    private readonly userProjection: UserProjectionService,
    private readonly configService: ConfigService,
  ) {}

  @Mutation(() => VideoUpload)
  @UseGuards(GqlAuthGuard)
  async createVideoUpload(
    @Args('input') input: CreateVideoUploadInput,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<VideoUpload> {
    const result = await this.filesGrpc.createVideoUpload(
      {
        title: input.title,
        description: input.description,
        filename: input.filename,
        mimeType: input.mimeType,
        size: input.size,
      },
      this.internalToken(),
      user.userId,
    );
    return {
      videoId: result.videoId,
      uploadUrl: result.uploadUrl,
    };
  }

  @Mutation(() => Video)
  @UseGuards(GqlAuthGuard)
  async completeVideoUpload(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Video> {
    const result = await this.filesGrpc.completeVideoUpload(
      id,
      this.internalToken(),
      user.userId,
    );
    return this.toVideo(result);
  }

  @Query(() => [Video])
  @UseGuards(GqlAuthGuard)
  async videos(@CurrentUser() user: AuthenticatedUser): Promise<Video[]> {
    const result = await this.filesGrpc.listVideos(
      this.internalToken(),
      user.userId,
    );
    return this.toVideos(result.videos ?? []);
  }

  @Query(() => Video, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async video(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Video | null> {
    try {
      const result = await this.filesGrpc.getVideo(
        id,
        this.internalToken(),
        user.userId,
      );
      return await this.toVideo(result);
    } catch (error) {
      if (isVideoNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  private async toVideo(video: VideoResponse): Promise<Video> {
    const projection = await this.userProjection.findById(video.ownerUserId);
    return toVideoModel(video, toVideoAuthor(video.ownerUserId, projection));
  }

  private async toVideos(videos: VideoResponse[]): Promise<Video[]> {
    const ownerIds = [...new Set(videos.map((video) => video.ownerUserId))];
    const entries = await Promise.all(
      ownerIds.map(async (ownerUserId) => {
        const projection = await this.userProjection.findById(ownerUserId);
        return [ownerUserId, projection] as const;
      }),
    );
    const projections = new Map<string, UserResponse | null>(entries);
    return videos.map((video) =>
      toVideoModel(
        video,
        toVideoAuthor(
          video.ownerUserId,
          projections.get(video.ownerUserId) ?? null,
        ),
      ),
    );
  }

  private internalToken(): string {
    return this.configService.getOrThrow<string>('INTERNAL_SERVICE_TOKEN');
  }
}

function isVideoNotFound(error: unknown): boolean {
  return (
    error instanceof GraphQLError && error.extensions?.code === 'NOT_FOUND'
  );
}
