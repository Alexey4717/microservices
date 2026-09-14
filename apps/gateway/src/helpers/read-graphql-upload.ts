import { BadRequestException } from '@nestjs/common';

import { type FileUpload } from 'graphql-upload-ts';

import { AVATAR_MAX_BYTES } from '@libs/common';

export type UploadedAvatar = {
  filename: string;
  mimeType: string;
  buffer: Buffer;
};

export async function readGraphqlUpload(
  file: Promise<FileUpload> | FileUpload,
): Promise<UploadedAvatar> {
  const upload = await file;
  if (!upload?.createReadStream) {
    throw new BadRequestException('File is required');
  }

  const chunks: Uint8Array[] = [];
  let size = 0;
  const stream = upload.createReadStream();

  try {
    for await (const chunk of stream) {
      if (!(chunk instanceof Uint8Array)) {
        throw new BadRequestException('Failed to read uploaded file');
      }
      size += chunk.byteLength;
      if (size > AVATAR_MAX_BYTES) {
        stream.destroy();
        throw new BadRequestException('File too large');
      }
      chunks.push(chunk);
    }
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException('Failed to read uploaded file');
  }

  return {
    filename: upload.filename,
    mimeType: upload.mimetype,
    buffer: Buffer.concat(chunks),
  };
}
