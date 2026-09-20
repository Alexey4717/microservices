import { type Metadata } from '@grpc/grpc-js';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { INTERNAL_TOKEN_METADATA_KEY } from '@libs/common';
import { AUTH_SERVICE_NAME } from '@libs/proto';

import { UsersGrpcService } from './users-grpc.service';

const INTERNAL_TOKEN = 'internal-token';

describe('UsersGrpcService', () => {
  const upsertTelegramProfile = vi.fn();
  const getMeByTelegram = vi.fn();
  const consumeTelegramLinkToken = vi.fn();
  const client = {
    getService: vi.fn(),
  };
  let service: UsersGrpcService;

  beforeEach(() => {
    vi.clearAllMocks();
    upsertTelegramProfile.mockReturnValue(of({ id: 'u1' }));
    getMeByTelegram.mockReturnValue(of({ id: 'u1' }));
    consumeTelegramLinkToken.mockReturnValue(of({ id: 'u1' }));
    client.getService.mockReturnValue({
      getMeByTelegram,
      consumeTelegramLinkToken,
      upsertTelegramProfile,
    });
    service = new UsersGrpcService(client as never);
    service.onModuleInit();
  });

  it('берёт AuthService из gRPC-клиента', () => {
    expect(client.getService).toHaveBeenCalledWith(AUTH_SERVICE_NAME);
  });

  it('upsertTelegramProfile вызывает camelCase RPC', async () => {
    await expect(
      service.upsertTelegramProfile({ telegramId: '100' }, INTERNAL_TOKEN),
    ).resolves.toEqual({ id: 'u1' });
    expect(upsertTelegramProfile.mock.calls[0]?.[0]).toEqual({
      telegramId: '100',
    });
    const metadata = upsertTelegramProfile.mock.calls[0]?.[1] as Metadata;
    expect(metadata.get(INTERNAL_TOKEN_METADATA_KEY)).toEqual([INTERNAL_TOKEN]);
  });

  it('consumeTelegramLinkToken проксирует запрос', async () => {
    await service.consumeTelegramLinkToken(
      { telegramId: '100', token: 'abc' },
      INTERNAL_TOKEN,
    );
    expect(consumeTelegramLinkToken).toHaveBeenCalledWith(
      { telegramId: '100', token: 'abc' },
      expect.any(Object),
    );
  });
});
