import { RpcException } from '@nestjs/microservices';

import { status } from '@grpc/grpc-js';
import { createHmac, timingSafeEqual } from 'node:crypto';

export const TELEGRAM_WEBAPP_AUTH_MAX_AGE_SEC = 24 * 60 * 60;

export type TelegramWebAppInitDataRequest = {
  initData: string;
};

const UNAUTHENTICATED = {
  code: status.UNAUTHENTICATED,
  message: 'Invalid Telegram initData',
} as const;

export function parseTelegramWebAppUserId(
  initData: string,
  botToken: string,
  nowSec = Math.floor(Date.now() / 1000),
): string {
  const raw = initData?.trim();
  if (!raw || !botToken) {
    throw new RpcException(UNAUTHENTICATED);
  }

  const params = new URLSearchParams(raw);
  const hash = params.get('hash');
  if (!hash) {
    throw new RpcException(UNAUTHENTICATED);
  }
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();
  const computed = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (!safeEqualHex(hash, computed)) {
    throw new RpcException(UNAUTHENTICATED);
  }

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || authDate <= 0) {
    throw new RpcException(UNAUTHENTICATED);
  }

  const ageSec = nowSec - authDate;
  if (ageSec > TELEGRAM_WEBAPP_AUTH_MAX_AGE_SEC || ageSec < -60) {
    throw new RpcException(UNAUTHENTICATED);
  }

  let user: { id?: unknown };
  try {
    user = JSON.parse(params.get('user') ?? '') as { id?: unknown };
  } catch {
    throw new RpcException(UNAUTHENTICATED);
  }

  const telegramId = telegramIdFromUnknown(user.id);
  if (!telegramId) {
    throw new RpcException(UNAUTHENTICATED);
  }

  return telegramId;
}

function telegramIdFromUnknown(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return '';
}

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[0-9a-f]+$/i.test(left) || !/^[0-9a-f]+$/i.test(right)) {
    return false;
  }
  const leftBuf = Buffer.from(left, 'hex');
  const rightBuf = Buffer.from(right, 'hex');
  if (leftBuf.length === 0 || leftBuf.length !== rightBuf.length) {
    return false;
  }
  return timingSafeEqual(leftBuf, rightBuf);
}
