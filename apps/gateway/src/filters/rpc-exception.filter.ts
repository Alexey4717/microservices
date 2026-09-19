import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { type GqlExceptionFilter } from '@nestjs/graphql';

import type { Response } from 'express';
import { GraphQLError } from 'graphql';

import {
  isRpcLikeError,
  mapRpcToGraphqlError,
  mapRpcToHttpException,
} from '@libs/common';

@Catch()
export class RpcExceptionFilter implements ExceptionFilter, GqlExceptionFilter {
  private readonly logger = new Logger(RpcExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): unknown {
    const type = host.getType<string>();

    if (type === 'rpc') {
      // RMQ noAck: false: handler сам ack'ает в finally. Rethrow здесь не нужен.
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
      );
      return;
    }

    if (type === 'http') {
      const response = host.switchToHttp().getResponse<Response>();
      const httpException = toHttpException(exception);
      const status = httpException.getStatus();
      const body = httpException.getResponse();
      response
        .status(status)
        .json(
          typeof body === 'string'
            ? { statusCode: status, message: body }
            : body,
        );
      return;
    }

    if (exception instanceof GraphQLError) {
      return exception;
    }
    if (isRpcLikeError(exception)) {
      return mapRpcToGraphqlError(exception);
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const message = extractMessage(exception);
      return new GraphQLError(message, {
        extensions: {
          code:
            status === Number(HttpStatus.UNAUTHORIZED)
              ? 'UNAUTHENTICATED'
              : status === Number(HttpStatus.FORBIDDEN)
                ? 'FORBIDDEN'
                : 'INTERNAL_SERVER_ERROR',
          http: { status },
        },
      });
    }

    return exception;
  }
}

function toHttpException(exception: unknown): HttpException {
  if (exception instanceof HttpException) {
    return exception;
  }
  if (isRpcLikeError(exception)) {
    return mapRpcToHttpException(exception);
  }
  if (exception instanceof GraphQLError) {
    const status =
      (exception.extensions?.http as { status?: number } | undefined)?.status ??
      HttpStatus.INTERNAL_SERVER_ERROR;
    return new HttpException(exception.message, status);
  }
  return new HttpException(
    'Internal server error',
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}

function extractMessage(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === 'string') {
    return response;
  }
  if (
    typeof response === 'object' &&
    response !== null &&
    'message' in response
  ) {
    const message = (response as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message)) {
      return message.join(', ');
    }
  }
  return exception.message;
}
