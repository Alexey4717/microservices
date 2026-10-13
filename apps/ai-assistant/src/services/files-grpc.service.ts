import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { type ClientGrpc } from '@nestjs/microservices';

import { type Metadata } from '@grpc/grpc-js';
import { type Observable, lastValueFrom } from 'rxjs';

import { FILES_GRPC_CLIENT, createInternalMetadata } from '@libs/common';
import { FILES_SERVICE_NAME } from '@libs/proto';
import type {
  GetVideoRequest,
  ListVideosRequest,
  ListVideosResponse,
  VideoResponse,
} from '@libs/proto';

interface FilesGrpcClient {
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

  async listVideos(internalToken: string): Promise<VideoResponse[]> {
    const response = await lastValueFrom(
      this.files.listVideos({}, createInternalMetadata(internalToken)),
    );
    return response.videos ?? [];
  }

  getVideo(id: string, internalToken: string): Promise<VideoResponse> {
    return lastValueFrom(
      this.files.getVideo({ id }, createInternalMetadata(internalToken)),
    );
  }
}
