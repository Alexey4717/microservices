import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const VIDEO_UPLOAD_TTL_SECONDS = 15 * 60;

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly videosBucket: string;
  private readonly publicBaseUrl: string;

  constructor(configService: ConfigService) {
    this.bucket = configService.getOrThrow<string>('S3_BUCKET');
    this.videosBucket = configService.getOrThrow<string>('S3_VIDEOS_BUCKET');
    this.publicBaseUrl = configService
      .getOrThrow<string>('S3_PUBLIC_BASE_URL')
      .replace(/\/$/, '');

    this.client = new S3Client({
      region: configService.getOrThrow<string>('S3_REGION'),
      endpoint: configService.getOrThrow<string>('S3_ENDPOINT'),
      forcePathStyle:
        configService.get<string>('S3_FORCE_PATH_STYLE') !== 'false',
      credentials: {
        accessKeyId: configService.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: configService.getOrThrow<string>('S3_SECRET_KEY'),
      },
      // Браузерный PUT не шлёт checksum SDK: иначе подпись presigned URL не сойдётся.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  getBucket(): string {
    return this.bucket;
  }

  getVideosBucket(): string {
    return this.videosBucket;
  }

  async putObject(params: {
    key: string;
    body: Buffer;
    mimeType: string;
  }): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.mimeType,
        ContentLength: params.body.length,
      }),
    );

    return `${this.publicBaseUrl}/${this.bucket}/${params.key}`;
  }

  async presignVideoPut(params: {
    key: string;
    mimeType: string;
  }): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.videosBucket,
      Key: params.key,
      ContentType: params.mimeType,
    });

    // presigner и client-s3 тащат разные копии @smithy/core, private field `handlers` не совпадает.
    const signerClient = this.client as unknown as Parameters<
      typeof getSignedUrl
    >[0];
    return getSignedUrl(signerClient, command, {
      expiresIn: VIDEO_UPLOAD_TTL_SECONDS,
      signableHeaders: new Set(['content-type']),
    });
  }

  async headVideoSize(key: string): Promise<number | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.videosBucket,
          Key: key,
        }),
      );
      return result.ContentLength ?? null;
    } catch (error) {
      if (isMissingObject(error)) {
        return null;
      }
      throw error;
    }
  }

  videoPublicUrl(key: string): string {
    const normalizedKey = key.replace(/^\/+/, '');
    return `${this.publicBaseUrl}/${this.videosBucket}/${normalizedKey}`;
  }
}

function isMissingObject(error: unknown): boolean {
  if (error instanceof NotFound) {
    return true;
  }
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  if ('name' in error) {
    const name = (error as { name?: unknown }).name;
    if (name === 'NotFound' || name === 'NoSuchKey') {
      return true;
    }
  }
  if ('$metadata' in error) {
    const metadata = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata;
    return metadata?.httpStatusCode === 404;
  }
  return false;
}
