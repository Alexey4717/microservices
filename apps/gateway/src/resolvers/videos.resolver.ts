import { UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Args,
  Context,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';

import { GraphQLError } from 'graphql';

import { CurrentUser } from '../decorators/current-user.decorator';
import { CreateVideoUploadInput } from '../dto/create-video-upload.input';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { VideoAuthorLoader } from '../loaders/video-author.loader';
import {
  type VideoParent,
  toVideoAuthor,
  toVideoParent,
} from '../mappers/video.mapper';
import { VideoUpload } from '../models/video-upload.model';
import { Video, VideoAuthor } from '../models/video.model';
import { FilesGrpcService } from '../services/files-grpc.service';
import type { AuthenticatedUser } from '../types/auth.types';
import type { GqlContext } from '../types/gql-context';

@Resolver(() => Video)
export class VideosResolver {
  constructor(
    private readonly filesGrpc: FilesGrpcService,
    private readonly videoAuthorLoader: VideoAuthorLoader,
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
  ): Promise<VideoParent> {
    const result = await this.filesGrpc.completeVideoUpload(
      id,
      this.internalToken(),
      user.userId,
    );
    return toVideoParent(result);
  }

  @Query(() => [Video])
  async videos(): Promise<VideoParent[]> {
    const result = await this.filesGrpc.listVideos(this.internalToken());
    return (result.videos ?? []).map(toVideoParent);
  }

  @Query(() => Video, { nullable: true })
  async video(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<VideoParent | null> {
    try {
      const result = await this.filesGrpc.getVideo(id, this.internalToken());
      return toVideoParent(result);
    } catch (error) {
      if (isVideoNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  @ResolveField(() => VideoAuthor)
  async author(
    @Parent() video: VideoParent,
    @Context() context: GqlContext,
  ): Promise<VideoAuthor> {
    const projection = await this.videoAuthorLoader
      .get(context)
      .load(video.ownerUserId);
    return toVideoAuthor(video.ownerUserId, projection);
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
