import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { status } from '@grpc/grpc-js';
import { GraphQLError } from 'graphql';

export interface ParsedRpcError {
  code: status;
  message: string;
}

function readErrorField(error: object, key: string): unknown {
  return (error as Record<string, unknown>)[key];
}

export function parseRpcError(error: unknown): ParsedRpcError {
  if (typeof error === 'object' && error !== null) {
    const nestedError = readErrorField(error, 'error');
    if (typeof nestedError === 'object' && nestedError !== null) {
      const nested = parseRpcError(nestedError);
      if (
        nested.code !== status.UNKNOWN ||
        nested.message !== 'Internal error'
      ) {
        return nested;
      }
    }

    const codeRaw =
      readErrorField(error, 'code') ?? readErrorField(error, 'status');
    const details = readErrorField(error, 'details');
    const messageRaw = readErrorField(error, 'message');
    const parsedCode = typeof codeRaw === 'number' ? codeRaw : Number(codeRaw);
    const message =
      (typeof details === 'string' && details) ||
      (typeof messageRaw === 'string' && messageRaw) ||
      'Internal error';

    if (!Number.isNaN(parsedCode)) {
      return { code: parsedCode, message: stripGrpcPrefix(message) };
    }

    if (typeof messageRaw === 'string') {
      const match = /^(\d+)\s+[A-Z_]+:\s*(.*)$/.exec(messageRaw);
      if (match) {
        return { code: Number(match[1]), message: match[2] };
      }
    }
  }

  if (error instanceof Error) {
    return { code: status.UNKNOWN, message: error.message };
  }

  return { code: status.UNKNOWN, message: 'Internal error' };
}

function stripGrpcPrefix(message: string): string {
  return message.replace(/^\d+\s+[A-Z_]+:\s*/, '');
}

export function rpcCodeToHttpStatus(code: status): number {
  switch (code) {
    case status.INVALID_ARGUMENT:
    case status.FAILED_PRECONDITION:
      return HttpStatus.BAD_REQUEST;
    case status.UNAUTHENTICATED:
      return HttpStatus.UNAUTHORIZED;
    case status.PERMISSION_DENIED:
      return HttpStatus.FORBIDDEN;
    case status.NOT_FOUND:
      return HttpStatus.NOT_FOUND;
    case status.ALREADY_EXISTS:
      return HttpStatus.CONFLICT;
    default:
      return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}

export function rpcCodeToGraphqlCode(code: status): string {
  switch (code) {
    case status.INVALID_ARGUMENT:
    case status.FAILED_PRECONDITION:
      return 'BAD_REQUEST';
    case status.UNAUTHENTICATED:
      return 'UNAUTHENTICATED';
    case status.PERMISSION_DENIED:
      return 'FORBIDDEN';
    case status.NOT_FOUND:
      return 'NOT_FOUND';
    case status.ALREADY_EXISTS:
      return 'CONFLICT';
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

export function mapRpcToHttpException(error: unknown): HttpException {
  const parsed = parseRpcError(error);
  const message = parsed.message;

  switch (parsed.code) {
    case status.UNAUTHENTICATED:
      return new UnauthorizedException(message);
    case status.PERMISSION_DENIED:
      return new ForbiddenException(message);
    case status.INVALID_ARGUMENT:
    case status.FAILED_PRECONDITION:
      return new BadRequestException(message);
    case status.NOT_FOUND:
      return new NotFoundException(message);
    case status.ALREADY_EXISTS:
      return new ConflictException(message);
    default:
      return new HttpException(message, rpcCodeToHttpStatus(parsed.code));
  }
}

export function mapRpcToGraphqlError(error: unknown): GraphQLError {
  const parsed = parseRpcError(error);
  const httpStatus = rpcCodeToHttpStatus(parsed.code);

  return new GraphQLError(parsed.message, {
    extensions: {
      code: rpcCodeToGraphqlCode(parsed.code),
      http: { status: httpStatus },
    },
  });
}

const TRANSPORT_STATUS_CODES = new Set<status>([
  status.UNAVAILABLE,
  status.DEADLINE_EXCEEDED,
  status.CANCELLED,
]);

const TRANSPORT_MESSAGE_PATTERN =
  /UNAVAILABLE|DEADLINE_EXCEEDED|ECONNREFUSED|ECONNRESET|ENOTFOUND|ETIMEDOUT|Failed to connect|Connection dropped|No connection established/i;

export function isUsersTransportError(error: unknown): boolean {
  if (error == null) {
    return false;
  }

  if (
    typeof error === 'object' &&
    'name' in error &&
    (error as { name?: unknown }).name === 'TimeoutError'
  ) {
    return true;
  }

  const parsed = parseRpcError(error);
  if (TRANSPORT_STATUS_CODES.has(parsed.code)) {
    return true;
  }

  const code =
    typeof error === 'object' && 'code' in error
      ? (error as { code?: unknown }).code
      : undefined;
  if (
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'ENOTFOUND' ||
    code === 'ETIMEDOUT'
  ) {
    return true;
  }

  return TRANSPORT_MESSAGE_PATTERN.test(parsed.message);
}

export function isRpcLikeError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  return (
    'code' in error ||
    'details' in error ||
    ('message' in error &&
      typeof (error as { message?: unknown }).message === 'string' &&
      /^\d+\s+[A-Z_]+:/.test((error as { message: string }).message))
  );
}
