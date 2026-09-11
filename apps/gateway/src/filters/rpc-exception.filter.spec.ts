import { type ArgumentsHost, HttpException, Logger } from '@nestjs/common';

import { GraphQLError } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RpcExceptionFilter } from './rpc-exception.filter';

function hostOf(
  type: string,
  httpResponse?: { status: ReturnType<typeof vi.fn> },
) {
  return {
    getType: () => type,
    switchToHttp: () => ({
      getResponse: () => httpResponse,
    }),
  } as unknown as ArgumentsHost;
}

describe('RpcExceptionFilter', () => {
  let filter: RpcExceptionFilter;

  beforeEach(() => {
    filter = new RpcExceptionFilter();
  });

  it('для rpc логирует и не пробрасывает', () => {
    const errorSpy = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const err = new Error('P1003: database does not exist');

    expect(() => filter.catch(err, hostOf('rpc'))).not.toThrow();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('для graphql не глотает ошибку, а возвращает GraphQLError', () => {
    const gqlError = new GraphQLError('unauthenticated');
    expect(filter.catch(gqlError, hostOf('graphql'))).toBe(gqlError);
  });

  it('для http отвечает статусом, не маппит rpc-ветку', () => {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const httpException = new HttpException('forbidden', 403);

    expect(() =>
      filter.catch(httpException, hostOf('http', { status })),
    ).not.toThrow();
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalled();
  });
});
