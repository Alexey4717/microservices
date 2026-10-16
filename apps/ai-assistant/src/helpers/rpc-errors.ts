import { RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';

export function rpcError(code: status, message: string): RpcException {
  return new RpcException({ code, message });
}

export function asRpcException(error: unknown): RpcException {
  if (error instanceof RpcException) {
    return error;
  }
  return rpcError(status.INTERNAL, 'Не удалось получить ответ ассистента');
}
