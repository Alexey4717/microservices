import { RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  TELEGRAM_WEBAPP_AUTH_MAX_AGE_SEC,
  parseTelegramWebAppUserId,
} from './telegram-webapp-init-data';

const BOT_TOKEN = 'test-bot-token';
const NOW_SEC = 1_700_000_000;

function signInitData(fields: Record<string, string>): string {
  const entries = Object.entries(fields).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  const dataCheckString = entries
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData')
    .update(BOT_TOKEN)
    .digest();
  const hash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
  const params = new URLSearchParams(fields);
  params.set('hash', hash);
  return params.toString();
}

function rpcError(error: unknown): { code: status; message: string } {
  return (error as RpcException).getError() as {
    code: status;
    message: string;
  };
}

describe('parseTelegramWebAppUserId', () => {
  it('принимает свежий подписанный initData и возвращает user.id', () => {
    const initData = signInitData({
      auth_date: String(NOW_SEC - 60),
      query_id: 'AAE',
      user: JSON.stringify({ id: 100, first_name: 'Ann' }),
    });

    expect(parseTelegramWebAppUserId(initData, BOT_TOKEN, NOW_SEC)).toBe('100');
  });

  it('отклоняет битую подпись', () => {
    const initData = signInitData({
      auth_date: String(NOW_SEC),
      user: JSON.stringify({ id: 100 }),
    }).replace(/hash=[0-9a-f]+/i, 'hash=deadbeef');

    try {
      parseTelegramWebAppUserId(initData, BOT_TOKEN, NOW_SEC);
      expect.fail('должен бросить RpcException');
    } catch (error) {
      expect(error).toBeInstanceOf(RpcException);
      expect(rpcError(error)).toMatchObject({
        code: status.UNAUTHENTICATED,
        message: 'Invalid Telegram initData',
      });
    }
  });

  it('отклоняет initData старше 24 часов', () => {
    const initData = signInitData({
      auth_date: String(NOW_SEC - TELEGRAM_WEBAPP_AUTH_MAX_AGE_SEC - 1),
      user: JSON.stringify({ id: 100 }),
    });

    expect(() =>
      parseTelegramWebAppUserId(initData, BOT_TOKEN, NOW_SEC),
    ).toThrow(RpcException);
  });

  it('отклоняет пустой initData', () => {
    expect(() => parseTelegramWebAppUserId('', BOT_TOKEN, NOW_SEC)).toThrow(
      RpcException,
    );
  });
});
