import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';
import { Observable } from 'rxjs';

import { INTERNAL_TOKEN_METADATA_KEY, getMetadataValue } from '@libs/common';

import { extractGrpcMetadata } from './grpc-context';

@Injectable()
export class InternalTokenInterceptor implements NestInterceptor {
  constructor(private readonly configService: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = extractGrpcMetadata(context);
    const incoming = getMetadataValue(metadata, INTERNAL_TOKEN_METADATA_KEY);
    const expected = this.configService.getOrThrow<string>(
      'INTERNAL_SERVICE_TOKEN',
    );

    if (!incoming || incoming !== expected) {
      throw new RpcException({
        code: status.UNAUTHENTICATED,
        message: 'Invalid internal service token',
      });
    }

    return next.handle();
  }
}
