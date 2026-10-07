import { ConfigService } from '@nestjs/config';

import { describe, expect, it } from 'vitest';

import {
  GRPC_CHANNEL_OPTIONS,
  GRPC_LOADER_OPTIONS,
  GRPC_MAX_MESSAGE_BYTES,
  filesGrpcClientOptions,
  usersGrpcClientOptions,
} from '@libs/common';

import { AUTH_PACKAGE } from './auth.constants';
import { FILES_PACKAGE } from './files.constants';
import { getAuthProtoPath, getFilesProtoPath } from './proto-path';

function configReturning(urls: Record<string, string>): ConfigService {
  return {
    getOrThrow: (key: string) => {
      const value = urls[key];
      if (value === undefined) {
        throw new Error(`Missing ${key}`);
      }
      return value;
    },
  } as ConfigService;
}

describe('grpc client option factories', () => {
  it('usersGrpcClientOptions совпадает с пакетом auth и общим loader', () => {
    const options = usersGrpcClientOptions(
      configReturning({ USERS_GRPC_URL: '127.0.0.1:50051' }),
    );

    expect(options.options).toMatchObject({
      package: AUTH_PACKAGE,
      protoPath: getAuthProtoPath(),
      url: '127.0.0.1:50051',
      loader: { ...GRPC_LOADER_OPTIONS },
    });
  });

  it('filesGrpcClientOptions совпадает с пакетом files и лимитами сообщений', () => {
    const options = filesGrpcClientOptions(
      configReturning({ FILES_GRPC_URL: '127.0.0.1:50052' }),
    );

    expect(options.options).toMatchObject({
      package: FILES_PACKAGE,
      protoPath: getFilesProtoPath(),
      url: '127.0.0.1:50052',
      loader: { ...GRPC_LOADER_OPTIONS },
      maxReceiveMessageLength: GRPC_MAX_MESSAGE_BYTES,
      maxSendMessageLength: GRPC_MAX_MESSAGE_BYTES,
      channelOptions: { ...GRPC_CHANNEL_OPTIONS },
    });
  });
});
