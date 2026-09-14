import 'reflect-metadata';

import { describe, expect, it } from 'vitest';

import { validateFilesEnv } from './env.validation';

const validFilesEnv = {
  FILES_DATABASE_URL: 'postgresql://localhost:5432/files',
  FILES_GRPC_URL: '127.0.0.1:50052',
  S3_ENDPOINT: 'http://127.0.0.1:9000',
  S3_PUBLIC_BASE_URL: 'http://127.0.0.1:9000/files',
  S3_REGION: 'us-east-1',
  S3_BUCKET: 'files',
  S3_ACCESS_KEY: 'access',
  S3_SECRET_KEY: 'secret',
  INTERNAL_SERVICE_TOKEN: 'token',
};

describe('validateFilesEnv', () => {
  it('приводит FILES_PORT из строки к числу', () => {
    const result = validateFilesEnv({
      ...validFilesEnv,
      FILES_PORT: '3002',
    });

    expect(result.FILES_PORT).toBe(3002);
  });
});
