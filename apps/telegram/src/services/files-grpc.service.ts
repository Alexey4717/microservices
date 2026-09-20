import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { type ClientGrpc } from '@nestjs/microservices';

import { Metadata } from '@grpc/grpc-js';
import { type Observable, lastValueFrom } from 'rxjs';

import { FILES_GRPC_CLIENT, createInternalMetadata } from '@libs/common';
import { FILES_SERVICE_NAME } from '@libs/proto';
import type { UploadFileRequest, UploadFileResponse } from '@libs/proto';

interface FilesGrpcClient {
  uploadFile(
    data: UploadFileRequest,
    metadata: Metadata,
  ): Observable<UploadFileResponse>;
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
    return lastValueFrom(
      this.files.uploadFile(
        data,
        createInternalMetadata(internalToken, userId),
      ),
    );
  }
}
