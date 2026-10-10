import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { type ClientGrpc } from '@nestjs/microservices';

import { Metadata } from '@grpc/grpc-js';
import { type Observable, lastValueFrom } from 'rxjs';

import {
  FILES_GRPC_CLIENT,
  createInternalMetadata,
  mapRpcToGraphqlError,
} from '@libs/common';
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

interface FilesGrpcClient {
  uploadFile(
    data: UploadFileRequest,
    metadata: Metadata,
  ): Observable<UploadFileResponse>;
  createVideoUpload(
    data: CreateVideoUploadRequest,
    metadata: Metadata,
  ): Observable<CreateVideoUploadResponse>;
  completeVideoUpload(
    data: CompleteVideoUploadRequest,
    metadata: Metadata,
  ): Observable<VideoResponse>;
  listVideos(
    data: ListVideosRequest,
    metadata: Metadata,
  ): Observable<ListVideosResponse>;
  getVideo(
    data: GetVideoRequest,
    metadata: Metadata,
  ): Observable<VideoResponse>;
}

@Injectable()
export class FilesGrpcService implements OnModuleInit {
  private files!: FilesGrpcClient;

  constructor(@Inject(FILES_GRPC_CLIENT) private readonly client: ClientGrpc) {}

  onModuleInit(): void {
    this.files = this.client.getService<FilesGrpcClient>(FILES_SERVICE_NAME);
  }

  uploadFile(
    data: UploadFileRequest,
    internalToken: string,
    userId: string,
  ): Promise<UploadFileResponse> {
    return this.callGraphql(() =>
      this.files.uploadFile(
        data,
        createInternalMetadata(internalToken, userId),
      ),
    );
  }

  createVideoUpload(
    data: CreateVideoUploadRequest,
    internalToken: string,
    userId: string,
  ): Promise<CreateVideoUploadResponse> {
    return this.callGraphql(() =>
      this.files.createVideoUpload(
        data,
        createInternalMetadata(internalToken, userId),
      ),
    );
  }

  completeVideoUpload(
    id: string,
    internalToken: string,
    userId: string,
  ): Promise<VideoResponse> {
    return this.callGraphql(() =>
      this.files.completeVideoUpload(
        { id },
        createInternalMetadata(internalToken, userId),
      ),
    );
  }

  listVideos(
    internalToken: string,
    userId: string,
  ): Promise<ListVideosResponse> {
    return this.callGraphql(() =>
      this.files.listVideos({}, createInternalMetadata(internalToken, userId)),
    );
  }

  getVideo(
    id: string,
    internalToken: string,
    userId: string,
  ): Promise<VideoResponse> {
    return this.callGraphql(() =>
      this.files.getVideo(
        { id },
        createInternalMetadata(internalToken, userId),
      ),
    );
  }

  private async callGraphql<T>(factory: () => Observable<T>): Promise<T> {
    try {
      return await lastValueFrom(factory());
    } catch (error) {
      throw mapRpcToGraphqlError(error);
    }
  }
}
