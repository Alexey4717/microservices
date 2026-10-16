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

import { CompleteVideoUploadUseCase } from '../services/complete-video-upload.use-case';
import { CreateVideoUploadUseCase } from '../services/create-video-upload.use-case';
import { FilesService } from '../services/files.service';
import { GetVideoUseCase } from '../services/get-video.use-case';
import { ListVideosUseCase } from '../services/list-videos.use-case';

@Controller()
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly createVideoUploadUseCase: CreateVideoUploadUseCase,
    private readonly completeVideoUploadUseCase: CompleteVideoUploadUseCase,
    private readonly listVideosUseCase: ListVideosUseCase,
    private readonly getVideoUseCase: GetVideoUseCase,
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
    return this.createVideoUploadUseCase.execute(data, metadata);
  }

  @GrpcMethod(FILES_SERVICE_NAME, 'CompleteVideoUpload')
  completeVideoUpload(
    data: CompleteVideoUploadRequest,
    metadata: Metadata,
  ): Promise<VideoResponse> {
    return this.completeVideoUploadUseCase.execute(data, metadata);
  }

  @GrpcMethod(FILES_SERVICE_NAME, 'ListVideos')
  listVideos(
    _data: ListVideosRequest,
    metadata: Metadata,
  ): Promise<ListVideosResponse> {
    return this.listVideosUseCase.execute(metadata);
  }

  @GrpcMethod(FILES_SERVICE_NAME, 'GetVideo')
  getVideo(data: GetVideoRequest, metadata: Metadata): Promise<VideoResponse> {
    return this.getVideoUseCase.execute(data, metadata);
  }
}
