import { RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';

import type { UpdateMeRequest } from '@libs/proto';

export function normalizeEmail(email: string | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

export function assertEmail(email: string): void {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new RpcException({
      code: status.INVALID_ARGUMENT,
      message: 'Invalid email',
    });
  }
}

export function assertPassword(password: string): void {
  if (!password || password.length < 8) {
    throw new RpcException({
      code: status.INVALID_ARGUMENT,
      message: 'Password must be at least 8 characters',
    });
  }
}

export function hasOptionalField(
  data: UpdateMeRequest,
  field: 'name' | 'avatarUrl',
): boolean {
  return hasOptionalStringField(data, field);
}

export function hasOptionalStringField(data: object, field: string): boolean {
  const record = data as Record<string, unknown>;
  const oneof = record[`_${field}`];
  if (oneof === field) {
    return true;
  }
  return (
    oneof === undefined && Object.prototype.hasOwnProperty.call(data, field)
  );
}
