import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { Metadata } from '@grpc/grpc-js';

import { FILES_SERVICE_NAME } from '@libs/proto';
import type { UploadFileRequest, UploadFileResponse } from '@libs/proto';

import { FilesService } from '../services/files.service';

@Controller()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @GrpcMethod(FILES_SERVICE_NAME, 'UploadFile')
  uploadFile(
    data: UploadFileRequest,
    metadata: Metadata,
  ): Promise<UploadFileResponse> {
    return this.filesService.uploadFile(data, metadata);
  }
}
