import { ConfigService } from '@nestjs/config';
import { type GrpcOptions, Transport } from '@nestjs/microservices';

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  GRPC_CHANNEL_OPTIONS,
  GRPC_LOADER_OPTIONS,
  GRPC_MAX_MESSAGE_BYTES,
} from './grpc-loader';

const AUTH_PACKAGE = 'auth';
const AUTH_PROTO_FILE = 'auth.proto';
const FILES_PACKAGE = 'files';
const FILES_PROTO_FILE = 'files.proto';

// Первый кандидат совпадает с resolveProtoPath в @libs/proto: исходник важнее dist.
function resolveProtoPath(filename: string): string {
  const here = __dirname;
  const candidates = [
    join(process.cwd(), 'libs/proto/src', filename),
    join(here, '../proto/src', filename),
    join(process.cwd(), 'dist/libs/proto/src', filename),
    join(process.cwd(), 'dist/libs/proto', filename),
  ];

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      `Не найден ${filename}. Проверенные пути: ${candidates.join(', ')}`,
    );
  }

  return found;
}

export function usersGrpcClientOptions(config: ConfigService): GrpcOptions {
  return {
    transport: Transport.GRPC,
    options: {
      package: AUTH_PACKAGE,
      protoPath: resolveProtoPath(AUTH_PROTO_FILE),
      url: config.getOrThrow<string>('USERS_GRPC_URL'),
      loader: { ...GRPC_LOADER_OPTIONS },
    },
  };
}

export function filesGrpcClientOptions(config: ConfigService): GrpcOptions {
  return {
    transport: Transport.GRPC,
    options: {
      package: FILES_PACKAGE,
      protoPath: resolveProtoPath(FILES_PROTO_FILE),
      url: config.getOrThrow<string>('FILES_GRPC_URL'),
      loader: { ...GRPC_LOADER_OPTIONS },
      maxReceiveMessageLength: GRPC_MAX_MESSAGE_BYTES,
      maxSendMessageLength: GRPC_MAX_MESSAGE_BYTES,
      channelOptions: { ...GRPC_CHANNEL_OPTIONS },
    },
  };
}
