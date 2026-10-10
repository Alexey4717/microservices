import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { Metadata } from '@grpc/grpc-js';

import { FILES_SERVICE_NAME } from '@libs/proto';
import type {
  CompleteVideoUploadRequest,
  CreateVideoUploadRequest,
  CreateVideoUploadResponse,
  GetVideoRequest,
  ListVideosRequest,
  ListVideosResponse,
  UploadFileRequest,
  UploadFileResponse,
  VideoResponse,
} from '@libs/proto';

import { FilesService } from '../services/files.service';
import { VideosService } from '../services/videos.service';

@Controller()
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly videosService: VideosService,
  ) {}

  @GrpcMethod(FILES_SERVICE_NAME, 'UploadFile')
  uploadFile(
    data: UploadFileRequest,
    metadata: Metadata,
  ): Promise<UploadFileResponse> {
    return this.filesService.uploadFile(data, metadata);
  }

  @GrpcMethod(FILES_SERVICE_NAME, 'CreateVideoUpload')
  createVideoUpload(
    data: CreateVideoUploadRequest,
    metadata: Metadata,
  ): Promise<CreateVideoUploadResponse> {
    return this.videosService.createVideoUpload(data, metadata);
  }

  @GrpcMethod(FILES_SERVICE_NAME, 'CompleteVideoUpload')
  completeVideoUpload(
    data: CompleteVideoUploadRequest,
    metadata: Metadata,
  ): Promise<VideoResponse> {
    return this.videosService.completeVideoUpload(data, metadata);
  }

  @GrpcMethod(FILES_SERVICE_NAME, 'ListVideos')
  listVideos(
    _data: ListVideosRequest,
    metadata: Metadata,
  ): Promise<ListVideosResponse> {
    return this.videosService.listVideos(metadata);
  }

  @GrpcMethod(FILES_SERVICE_NAME, 'GetVideo')
  getVideo(data: GetVideoRequest, metadata: Metadata): Promise<VideoResponse> {
    return this.videosService.getVideo(data, metadata);
  }
}
